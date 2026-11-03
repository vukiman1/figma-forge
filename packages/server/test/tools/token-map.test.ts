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

  it('leads with the colour profile of a P3 document, and only then', async () => {
    const p3: ToolDispatcher = async tool => {
      if (tool === GET_VARIABLE_DEFS_TOOL_NAME) return { colorProfile: 'DISPLAY_P3', ...defs };
      if (tool === GET_STYLES_TOOL_NAME) return emptyStyles;
      throw new Error(`unexpected dispatch: ${tool}`);
    };
    const marked = await handleTokenMap(p3, { rootDir: dir });
    expect(Object.keys(marked)[0]).toBe('colorProfile');
    expect(marked.colorProfile).toBe('DISPLAY_P3');
    expect(marked.mappings.find(m => m.figmaName === 'Primary/500')?.candidate?.ref).toBe(
      'primary-500',
    );
    expect(await handleTokenMap(dispatch, { rootDir: dir })).not.toHaveProperty('colorProfile');
  });

  it('detects the v4 @theme source, maps Primary/500, flags the unmatched token', async () => {
    const result = await handleTokenMap(dispatch, { rootDir: dir });
    expect(result.tokenSource).toBe('src/app.css');
    expect(result.projectTokenCount).toBe(1);

    const primary = result.mappings.find(m => m.figmaName === 'Primary/500');
    expect(primary?.candidate?.ref).toBe('primary-500');
    expect(primary?.status).toBe('high');

    expect(result.unmapped).toContain('Accent/Teal');
    expect(result.themedCollections).toEqual([]);
    expect(result.profile.styling.tailwindVersion).toBe(4);
  });

  it('surfaces theme axes and per-mode values for a multi-mode collection', async () => {
    const themedDefs: GetVariableDefsResult = {
      collections: [
        ...defs.collections,
        {
          id: 'theme',
          name: 'Theme',
          key: 'k',
          defaultModeId: 'light',
          modes: [
            { modeId: 'light', name: 'Light' },
            { modeId: 'dark', name: 'Dark' },
          ],
          variableIds: [],
        },
      ],
      variables: [
        ...defs.variables,
        {
          id: 'bg',
          name: 'bg/surface',
          key: 'k',
          resolvedType: 'COLOR',
          collectionId: 'theme',
          valuesByMode: {
            light: { r: 1, g: 1, b: 1, a: 1 },
            dark: { r: 0.039, g: 0.039, b: 0.039, a: 1 },
          },
        },
      ],
    };
    const themedDispatch: ToolDispatcher = async tool => {
      if (tool === GET_VARIABLE_DEFS_TOOL_NAME) return themedDefs;
      if (tool === GET_STYLES_TOOL_NAME) return emptyStyles;
      throw new Error(`unexpected dispatch: ${tool}`);
    };

    const result = await handleTokenMap(themedDispatch, { rootDir: dir });
    expect(result.themedCollections).toEqual([
      { name: 'Theme', modes: ['Light', 'Dark'], defaultMode: 'Light' },
    ]);
    const surface = result.mappings.find(m => m.figmaName === 'bg/surface');
    expect(surface?.figmaModes).toEqual({ Light: '#FFFFFF', Dark: '#0A0A0A' });

    const primary = result.mappings.find(m => m.figmaName === 'Primary/500');
    expect(primary?.figmaModes).toBeUndefined();
    expect(primary?.status).toBe('high');
  });

  it('aggregates repo CSS custom properties when no single token config is detected (plain CSS vars)', async () => {
    const cssVars = await mkdtemp(join(tmpdir(), 'tokenmap-cssvars-'));
    try {
      await writeFile(
        join(cssVars, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.0.0' } }),
      );
      await mkdir(join(cssVars, 'src'), { recursive: true });
      await writeFile(
        join(cssVars, 'src', 'theme.css'),
        ':root {\n  --primary-500: #6266F0;\n  --header-height: 64px;\n}\n',
      );
      const result = await handleTokenMap(dispatch, { rootDir: cssVars });

      expect(result.tokenSource).toBeNull();
      expect(result.note).toMatch(/aggregated/i);
      expect(result.projectTokenCount).toBe(2);

      const primary = result.mappings.find(m => m.figmaName === 'Primary/500');
      expect(primary?.candidate?.ref).toBe('var(--primary-500)');
      expect(primary?.status).toBe('high');

      expect(result.unmapped).toContain('Accent/Teal');
    } finally {
      await rm(cssVars, { recursive: true, force: true });
    }
  });
});
