import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { handleAnalyzeProject } from '../../src/tools/analyze-project.handler.js';
import { handleScanComponents } from '../../src/tools/scan-components.handler.js';

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'figma-forge-local-tools-'));
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ dependencies: { vue: '^3.5.0' } }),
    'utf8',
  );
  await mkdir(join(root, 'src'), { recursive: true });

  await writeFile(
    join(root, 'src', 'BaseButton.vue'),
    '<script setup>defineProps({ label: String })</script>\n<template><button>{{ label }}</button></template>\n',
    'utf8',
  );

  await writeFile(
    join(root, 'src', 'Card.tsx'),
    'export function Card({ title }: { title: string }) {\n  return <div>{title}</div>;\n}\n',
    'utf8',
  );
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('handleAnalyzeProject', () => {
  it('analyzes the directory it is given', async () => {
    const profile = await handleAnalyzeProject({ rootDir: root });
    expect(profile.rootDir).toBe(root);
    expect(profile.framework).toBe('vue');
  });

  it('falls back to the server cwd when rootDir is omitted', async () => {
    const profile = await handleAnalyzeProject({});
    expect(profile.rootDir).toBe(process.cwd());
  });

  it('requires an argument object, which is what its only caller passes', async () => {
    await expect(handleAnalyzeProject({})).resolves.toMatchObject({ rootDir: process.cwd() });
    await expect(handleAnalyzeProject(undefined)).rejects.toThrow(/expected object/);
  });

  it('rejects a rootDir of the wrong type rather than coercing it', async () => {
    await expect(handleAnalyzeProject({ rootDir: 42 })).rejects.toThrow(/rootDir/);
  });
});

describe('handleScanComponents', () => {
  it('returns the scanned components alongside the profile they were scanned with', async () => {
    const { components, profile } = await handleScanComponents({ rootDir: root });
    expect(profile.framework).toBe('vue');
    expect(components.map(c => c.name)).toContain('BaseButton');
  });

  it("defaults the extensions to the detected profile's", async () => {
    const { components, profile } = await handleScanComponents({ rootDir: root });
    expect(profile.componentExtensions).toContain('.vue');
    expect(components.map(c => c.name)).not.toContain('Card');
  });

  it('honours an explicit extensions list over the detected default', async () => {
    const { components } = await handleScanComponents({ rootDir: root, extensions: ['.tsx'] });
    expect(components.map(c => c.name)).toEqual(['Card']);
  });

  it('rejects an extensions value that is not an array of strings', async () => {
    await expect(handleScanComponents({ rootDir: root, extensions: '.tsx' })).rejects.toThrow(
      /extensions/,
    );
    await expect(handleScanComponents({ rootDir: root, extensions: [1] })).rejects.toThrow(
      /extensions/,
    );
  });

  it('rejects a rootDir of the wrong type', async () => {
    await expect(handleScanComponents({ rootDir: ['/tmp'] })).rejects.toThrow(/rootDir/);
  });
});
