import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  installPlugin,
  PluginInstallStatus,
  resolvePluginInstallDir,
} from '../../src/plugin-install/install-plugin.js';

let root: string;
let bundleDir: string;
let installDir: string;

const writeBundle = async (code: string): Promise<void> => {
  await mkdir(join(bundleDir, 'dist'), { recursive: true });
  await writeFile(join(bundleDir, 'manifest.json'), '{"name":"Figma Forge"}');
  await writeFile(join(bundleDir, 'dist', 'code.js'), code);
  await writeFile(join(bundleDir, 'dist', 'index.html'), '<html></html>');
};

const installedCode = async (): Promise<string> =>
  readFile(join(installDir, 'dist', 'code.js'), 'utf8');

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'figma-forge-install-'));
  bundleDir = join(root, 'bundle');
  installDir = join(root, 'Figma Forge');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('installPlugin', () => {
  it('copies the bundled plugin and stamps its version on a fresh machine', async () => {
    await writeBundle('v1');
    const result = await installPlugin({ bundleDir, installDir, version: '1.0.0' });
    expect(result).toEqual({
      status: PluginInstallStatus.Installed,
      manifestPath: join(installDir, 'manifest.json'),
    });
    expect(await installedCode()).toBe('v1');
    expect(await readFile(join(installDir, '.version'), 'utf8')).toBe('1.0.0\n');
  });

  it('leaves an install of the same version untouched', async () => {
    await writeBundle('v1');
    await installPlugin({ bundleDir, installDir, version: '1.0.0' });
    await writeBundle('v1-rebuilt');
    const result = await installPlugin({ bundleDir, installDir, version: '1.0.0' });
    expect(result.status).toBe(PluginInstallStatus.UpToDate);
    expect(await installedCode()).toBe('v1');
  });

  it('overwrites an older install so the imported plugin follows the server version', async () => {
    await writeBundle('v1');
    await installPlugin({ bundleDir, installDir, version: '1.0.0' });
    await writeBundle('v2');
    const result = await installPlugin({ bundleDir, installDir, version: '1.1.0' });
    expect(result.status).toBe(PluginInstallStatus.Installed);
    expect(await installedCode()).toBe('v2');
  });

  it('never downgrades an install written by a newer server', async () => {
    await writeBundle('v2');
    await installPlugin({ bundleDir, installDir, version: '2.0.0' });
    await writeBundle('v1');
    const result = await installPlugin({ bundleDir, installDir, version: '1.0.0' });
    expect(result.status).toBe(PluginInstallStatus.NewerPresent);
    expect(await installedCode()).toBe('v2');
  });

  it('reinstalls when the version stamp is missing', async () => {
    await writeBundle('v1');
    await installPlugin({ bundleDir, installDir, version: '1.0.0' });
    await rm(join(installDir, '.version'));
    await writeBundle('v1-again');
    const result = await installPlugin({ bundleDir, installDir, version: '1.0.0' });
    expect(result.status).toBe(PluginInstallStatus.Installed);
    expect(await installedCode()).toBe('v1-again');
  });

  it('reports a build without a bundled plugin instead of creating an empty folder', async () => {
    const result = await installPlugin({ bundleDir, installDir, version: '1.0.0' });
    expect(result).toEqual({ status: PluginInstallStatus.NotBundled, bundleDir });
  });

  it('reports the reason when the install folder cannot be written', async () => {
    await writeBundle('v1');
    await writeFile(installDir, 'a file where the folder should be');
    const result = await installPlugin({ bundleDir, installDir, version: '1.0.0' });
    expect(result.status).toBe(PluginInstallStatus.Failed);
    expect(result).toHaveProperty('reason', expect.any(String));
  });
});

describe('resolvePluginInstallDir', () => {
  it('defaults to a visible Figma Forge folder in the home directory', () => {
    expect(resolvePluginInstallDir(undefined, '/Users/me')).toBe('/Users/me/Figma Forge');
    expect(resolvePluginInstallDir('', '/Users/me')).toBe('/Users/me/Figma Forge');
  });

  it('uses the override folder when one is set', () => {
    expect(resolvePluginInstallDir('/opt/forge', '/Users/me')).toBe('/opt/forge');
  });
});
