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
    for (const [relativePath, body] of Object.entries(files)) {
      await mkdir(join(root, relativePath, '..'), { recursive: true });
      await writeFile(join(root, relativePath), body);
    }
    return root;
  };

  it('reports the skip count even when nothing at all could be read', async () => {
    const v3 = await v3Project({
      'tailwind.config.js':
        "module.exports = { theme: { colors: require('tailwindcss/colors') } };",
    });
    try {
      const result = await handleTokenMap(dispatch, { rootDir: v3 });
      expect(result.note).toMatch(/1 theme entr\(ies\) were skipped/);
      expect(result.note).not.toMatch(/declares no scales/);
    } finally {
      await rm(v3, { recursive: true, force: true });
    }
  });

  it('does not offer a utility ref for a custom property outside @theme', async () => {
    const v3 = await v3Project({
      'tailwind.config.js': 'module.exports = { theme: { extend: {} } };',
      'src/theme.css': ':root { --color-primary-500: #6266F0; }',
    });
    try {
      const result = await handleTokenMap(dispatch, { rootDir: v3 });
      const primary = result.mappings.find(m => m.figmaName === 'Primary/500');
      expect(primary?.candidate?.ref).toBe('var(--color-primary-500)');
      expect(primary?.candidate?.utility).toBeUndefined();
    } finally {
      await rm(v3, { recursive: true, force: true });
    }
  });

  it('says an empty theme is empty rather than unreadable', async () => {
    const v3 = await v3Project({
      'tailwind.config.js': 'module.exports = { theme: { extend: {} } };',
    });
    try {
      const result = await handleTokenMap(dispatch, { rootDir: v3 });
      expect(result.note).toMatch(/declares no scales/i);
      expect(result.note).not.toMatch(/reachable/i);
    } finally {
      await rm(v3, { recursive: true, force: true });
    }
  });

  it('joins a pre-variables file (zero variables) via its shared paint styles', async () => {
    const noVars: GetVariableDefsResult = { collections: [], variables: [] };
    const styles: GetStylesResult = {
      ...emptyStyles,
      paints: [
        {
          id: 'S:1',
          name: 'Primary/500',
          key: 'k1',
          description: '',
          paints: [
            { type: 'SOLID', visible: true, opacity: 1, color: { r: 0.384, g: 0.4, b: 0.941 } },
          ],
        },
        {
          id: 'S:2',
          name: 'Hero/Gradient',
          key: 'k2',
          description: '',
          paints: [
            {
              type: 'GRADIENT_LINEAR',
              visible: true,
              opacity: 1,
              gradientStops: [],
              gradientTransform: [
                [1, 0, 0],
                [0, 1, 0],
              ],
            },
          ],
        },
      ],
    };
    const styleDispatch: ToolDispatcher = async tool => {
      if (tool === GET_VARIABLE_DEFS_TOOL_NAME) return noVars;
      if (tool === GET_STYLES_TOOL_NAME) return styles;
      throw new Error(`unexpected dispatch: ${tool}`);
    };

    const result = await handleTokenMap(styleDispatch, { rootDir: dir });
    const primary = result.mappings.find(m => m.figmaName === 'Primary/500');
    expect(primary?.source).toBe('style');
    expect(primary?.candidate?.ref).toBe('primary-500');
    expect(primary?.status).toBe('high');

    expect(result.mappings.some(m => m.figmaName === 'Hero/Gradient')).toBe(false);
  });

  it('keeps variable rows source-less when both variables and styles exist', async () => {
    const styles: GetStylesResult = {
      ...emptyStyles,
      paints: [
        {
          id: 'S:1',
          name: 'Primary/500',
          key: 'k1',
          description: '',
          paints: [
            { type: 'SOLID', visible: true, opacity: 1, color: { r: 0.384, g: 0.4, b: 0.941 } },
          ],
        },
      ],
    };
    const bothDispatch: ToolDispatcher = async tool => {
      if (tool === GET_VARIABLE_DEFS_TOOL_NAME) return defs;
      if (tool === GET_STYLES_TOOL_NAME) return styles;
      throw new Error(`unexpected dispatch: ${tool}`);
    };

    const result = await handleTokenMap(bothDispatch, { rootDir: dir });
    const rows = result.mappings.filter(m => m.figmaName === 'Primary/500');

    expect(rows).toHaveLength(2);
    expect(rows[0]?.source).toBeUndefined();
    expect(rows[1]?.source).toBe('style');
  });

  it('degrades to the variables-only join when get_styles fails (styles are additive)', async () => {
    const failingStyles: ToolDispatcher = async tool => {
      if (tool === GET_VARIABLE_DEFS_TOOL_NAME) return defs;
      if (tool === GET_STYLES_TOOL_NAME) throw new Error('styles timed out');
      throw new Error(`unexpected dispatch: ${tool}`);
    };
    const result = await handleTokenMap(failingStyles, { rootDir: dir });

    expect(result.mappings.find(m => m.figmaName === 'Primary/500')?.status).toBe('high');
    expect(result.mappings.every(m => m.source === undefined)).toBe(true);
  });

  describe('map-file overrides (docs/figma-token-map.md)', () => {
    let odir: string;
    beforeAll(async () => {
      odir = await mkdtemp(join(tmpdir(), 'tokenmap-ovr-'));
      await writeFile(
        join(odir, 'package.json'),
        JSON.stringify({
          devDependencies: { tailwindcss: '^4.0.0', '@tailwindcss/vite': '^4.0.0' },
        }),
      );
      await mkdir(join(odir, 'src'), { recursive: true });
      await writeFile(
        join(odir, 'src', 'app.css'),
        '@import "tailwindcss";\n@theme {\n  --color-primary-500: #6266F0;\n}\n',
      );
      await mkdir(join(odir, 'docs'), { recursive: true });
    });
    afterAll(async () => {
      await rm(odir, { recursive: true, force: true });
    });

    it('lets a docs/figma-token-map.md row override an unmapped token as map-file', async () => {
      await writeFile(
        join(odir, 'docs', 'figma-token-map.md'),
        '| Figma | Token |\n| --- | --- |\n| Accent/Teal | primary-500 |\n',
      );
      const result = await handleTokenMap(dispatch, { rootDir: odir });
      const teal = result.mappings.find(m => m.figmaName === 'Accent/Teal');
      expect(teal?.candidate?.token).toBe('color-primary-500');
      expect(teal?.candidate?.matchedBy).toEqual(['map-file']);
      expect(teal?.status).toBe('high');
      expect(result.unmapped).not.toContain('Accent/Teal');
      expect(result.staleOverrides).toBeUndefined();
    });

    it('reports a stale token override (ref gone) and degrades to the normal join', async () => {
      await writeFile(
        join(odir, 'docs', 'figma-token-map.md'),
        '| Accent/Teal | color-deleted-500 |\n',
      );
      const result = await handleTokenMap(dispatch, { rootDir: odir });
      const teal = result.mappings.find(m => m.figmaName === 'Accent/Teal');
      expect(teal?.candidate).toBeUndefined();
      expect(teal?.status).toBe('unmapped');
      expect(result.staleOverrides).toEqual([
        { figmaName: 'Accent/Teal', ref: 'color-deleted-500' },
      ]);
    });
  });
});
