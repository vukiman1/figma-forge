import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  GET_STYLES_TOOL_NAME,
  GET_VARIABLE_DEFS_TOOL_NAME,
  type GetStylesResult,
  type GetVariableDefsResult,
} from '@figma-forge/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { handleTokenMap, type ToolDispatcher } from '../../src/tools/token-map.handler.js';

const defs: GetVariableDefsResult = {
  collections: [
    {
      id: 'c',
      name: 'Tokens',
      key: 'k',
      defaultModeId: 'm',
      modes: [{ modeId: 'm', name: 'Default' }],
      variableIds: [],
    },
  ],
  variables: [
    {
      id: 'v1',
      name: 'Primary/500',
      key: 'k',
      resolvedType: 'COLOR',
      collectionId: 'c',
      valuesByMode: { m: { r: 0.384, g: 0.4, b: 0.941, a: 1 } },
    },
    {
      id: 'v2',
      name: 'Accent/Teal',
      key: 'k',
      resolvedType: 'COLOR',
      collectionId: 'c',
      valuesByMode: { m: { r: 0.078, g: 0.722, b: 0.651, a: 1 } },
    },
  ],
};

const emptyStyles: GetStylesResult = { paints: [], texts: [], effects: [], grids: [] };

const dispatch: ToolDispatcher = async tool => {
  if (tool === GET_VARIABLE_DEFS_TOOL_NAME) return defs;
  if (tool === GET_STYLES_TOOL_NAME) return emptyStyles;
  throw new Error(`unexpected dispatch: ${tool}`);
};

describe('handleTokenMap', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'tokenmap-test-'));
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ devDependencies: { tailwindcss: '^4.0.0', '@tailwindcss/vite': '^4.0.0' } }),
    );
    await mkdir(join(dir, 'src'), { recursive: true });
    await writeFile(
      join(dir, 'src', 'app.css'),
      '@import "tailwindcss";\n@theme {\n  --color-primary-500: #6266F0;\n}\n',
    );
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const v3Project = async (files: Record<string, string>): Promise<string> => {
    const root = await mkdtemp(join(tmpdir(), 'tokenmap-v3-'));
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ devDependencies: { tailwindcss: '^3.4.0' } }),
    );
    for (const [rel, body] of Object.entries(files)) {
      await mkdir(join(root, rel, '..'), { recursive: true });
      await writeFile(join(root, rel), body);
    }
    return root;
  };

  it('reads a Tailwind v3 JS config as the token source and maps by utility base', async () => {
    const v3 = await v3Project({
      'tailwind.config.js':
        "module.exports = { theme: { extend: { colors: { primary: { 500: '#6266F0' } } } } };",
    });
    try {
      const result = await handleTokenMap(dispatch, { rootDir: v3 });
      expect(result.tokenSource).toBe('tailwind.config.js');
      expect(result.profile.styling.tailwindVersion).toBe(3);

      const primary = result.mappings.find(m => m.figmaName === 'Primary/500');

      expect(primary?.candidate?.ref).toBe('primary-500');
      expect(primary?.candidate?.token).toBe('color-primary-500');
      expect(primary?.status).toBe('high');

      expect(primary?.candidate?.cssVar).toBeUndefined();
      expect(result.note).toMatch(/utilities/i);

      expect(result.unmapped).toContain('Accent/Teal');
    } finally {
      await rm(v3, { recursive: true, force: true });
    }
  });

  it('pools the repo CSS alongside a v3 config rather than replacing it', async () => {
    const v3 = await v3Project({
      'tailwind.config.js':
        "module.exports = { theme: { extend: { colors: { primary: { 500: '#6266F0' } } } } };",
      'src/theme.css': ':root { --accent-teal: #14B8A6; }',
    });
    try {
      const result = await handleTokenMap(dispatch, { rootDir: v3 });
      expect(result.mappings.find(m => m.figmaName === 'Primary/500')?.candidate?.ref).toBe(
        'primary-500',
      );

      const teal = result.mappings.find(m => m.figmaName === 'Accent/Teal');
      expect(teal?.candidate?.ref).toBe('var(--accent-teal)');
      expect(teal?.status).toBe('high');
      expect(result.unmapped).toEqual([]);
      expect(result.note).toMatch(/src\/theme\.css/);
    } finally {
      await rm(v3, { recursive: true, force: true });
    }
  });

  it('degrades to the CSS pool (with a note) when a v3 theme is not reachable', async () => {
    const v3 = await v3Project({
      'tailwind.config.js': "module.exports = require('./theme/build.js');",
      'src/theme.css': ':root { --color-primary-500: #6266F0; }',
    });
    try {
      const result = await handleTokenMap(dispatch, { rootDir: v3 });
      expect(result.note).toMatch(/no theme object was reachable/i);

      expect(result.mappings.find(m => m.figmaName === 'Primary/500')?.status).toBe('high');
    } finally {
      await rm(v3, { recursive: true, force: true });
    }
  });

  it('reads an UnoCSS config, in its own theme vocabulary, and pools the repo CSS too', async () => {
    const uno = await mkdtemp(join(tmpdir(), 'tokenmap-uno-'));
    try {
      await writeFile(
        join(uno, 'package.json'),
        JSON.stringify({ devDependencies: { unocss: '^66.0.0' } }),
      );
      await writeFile(
        join(uno, 'uno.config.ts'),
        `import { defineConfig, presetUno } from 'unocss'
         export default defineConfig({
           presets: [presetUno()],
           theme: { colors: { primary: { 500: '#6266F0' } }, breakpoints: { tablet: '768px' } },
         })`,
      );
      await mkdir(join(uno, 'src'), { recursive: true });
      await writeFile(join(uno, 'src', 'theme.css'), ':root { --accent-teal: #14B8A6; }');

      const result = await handleTokenMap(dispatch, { rootDir: uno });
      expect(result.profile.styling.system).toBe('unocss');
      expect(result.tokenSource).toBe('uno.config.ts');

      const primary = result.mappings.find(m => m.figmaName === 'Primary/500');

      expect(primary?.candidate?.ref).toBe('primary-500');
      expect(primary?.candidate?.cssVar).toBeUndefined();
      expect(primary?.status).toBe('high');

      const teal = result.mappings.find(m => m.figmaName === 'Accent/Teal');
      expect(teal?.candidate?.ref).toBe('var(--accent-teal)');
      expect(result.note).toMatch(/the UnoCSS config declares no CSS custom properties/);
    } finally {
      await rm(uno, { recursive: true, force: true });
    }
  });
});
