import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { scanComponents } from '../../src/scan/scan-components.js';

describe('scanComponents (real fs)', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'scan-test-'));
    await mkdir(join(dir, 'src', 'components', 'ui'), { recursive: true });
    await mkdir(join(dir, 'src', 'features', 'cart'), { recursive: true });
    await writeFile(
      join(dir, 'src', 'components', 'ui', 'Button.tsx'),
      'export function Button({ size }) { return <button/>; }',
    );
    await writeFile(
      join(dir, 'src', 'features', 'cart', 'cart-item.tsx'),
      'export default function CartItem() { return <li/>; }',
    );
    await mkdir(join(dir, 'node_modules', 'pkg'), { recursive: true });
    await writeFile(join(dir, 'node_modules', 'pkg', 'Evil.tsx'), 'export function Evil() {}');
    await mkdir(join(dir, 'vendor', 'pkg'), { recursive: true });
    await writeFile(join(dir, 'vendor', 'pkg', 'Vendored.tsx'), 'export function Vendored() {}');
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('finds components in any folder shape and prunes node_modules and vendor at the walk', async () => {
    const { components: comps } = await scanComponents(dir, ['.tsx', '.jsx']);
    const names = comps.map(c => c.name).toSorted();
    expect(names).toEqual(['Button', 'CartItem']);
    expect(comps.every(c => !/node_modules|vendor/.test(c.filePath))).toBe(true);
  });

  it('finds components for a single-extension profile and parses its defineProps', async () => {
    const vueDir = await mkdtemp(join(tmpdir(), 'scan-vue-'));
    try {
      await mkdir(join(vueDir, 'src', 'components'), { recursive: true });
      await writeFile(
        join(vueDir, 'src', 'components', 'Button.vue'),
        '<script setup lang="ts">defineProps<{ size?: string }>()</script><template><button/></template>',
      );
      const { components: comps } = await scanComponents(vueDir, ['.vue']);
      expect(comps.map(c => c.name)).toEqual(['Button']);
      expect(comps[0]?.framework).toBe('vue');
      expect(comps[0]?.propNames).toEqual(['size']);
      expect(comps[0]?.propsExtracted).toBe(true);
    } finally {
      await rm(vueDir, { recursive: true, force: true });
    }
  });

  it('scans an Angular .ts profile, keeping @Component classes and skipping services', async () => {
    const ngDir = await mkdtemp(join(tmpdir(), 'scan-ng-'));
    try {
      await mkdir(join(ngDir, 'src', 'app', 'button'), { recursive: true });
      await writeFile(
        join(ngDir, 'src', 'app', 'button', 'button.component.ts'),
        `import { Component, input } from '@angular/core';
         @Component({ selector: 'app-button', template: '' })
         export class ButtonComponent { size = input('md'); }`,
      );
      await writeFile(
        join(ngDir, 'src', 'app', 'data.service.ts'),
        `import { Injectable } from '@angular/core';
         @Injectable() export class DataService {}`,
      );
      const { components: comps } = await scanComponents(ngDir, ['.ts']);
      expect(comps.map(c => c.name)).toEqual(['Button']);
      expect(comps[0]?.framework).toBe('angular');
      expect(comps[0]?.propNames).toEqual(['size']);
    } finally {
      await rm(ngDir, { recursive: true, force: true });
    }
  });
});
