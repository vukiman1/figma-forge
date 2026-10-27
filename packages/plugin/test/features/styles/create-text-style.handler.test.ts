import type { StyleResult } from '@figma-forge/core';
import { describe, expect, it, vi } from 'vitest';

import { createCreateTextStyleHandler } from '../../../src/features/styles/create-text-style.handler.js';

const fakeFigma = (
  { missingFont }: { missingFont?: string } = {},
  variables: Record<string, unknown> = {},
): {
  figma: typeof figma;
  loaded: FontName[];
  style: Record<string, unknown>;
  createTextStyle: ReturnType<typeof vi.fn<() => Record<string, unknown>>>;
  bound: [string, unknown][];
  removed: () => number;
} => {
  const loaded: FontName[] = [];
  const bound: [string, unknown][] = [];
  let removed = 0;
  const style: Record<string, unknown> = {
    id: 'S:0',
    name: '',
    setBoundVariable: (field: string, variable: unknown) => bound.push([field, variable]),
    remove: () => {
      removed += 1;
    },
  };
  const createTextStyle = vi.fn<() => Record<string, unknown>>(() => style);
  const figmaCtx = {
    createTextStyle,
    variables: { getVariableByIdAsync: async (id: string) => variables[id] ?? null },
    loadFontAsync: vi.fn<(fn: FontName) => Promise<void>>(async (fn: FontName) => {
      if (fn.family === missingFont) throw new Error(`Cannot find font ${fn.family}`);
      loaded.push(fn);
    }),
  } as unknown as typeof figma;
  return { figma: figmaCtx, loaded, style, createTextStyle, bound, removed: () => removed };
};

describe('create_text_style handler', () => {
  it('creates a text style, loading the font before assigning it', async () => {
    const { figma: f, loaded, style } = fakeFigma();
    const handler = createCreateTextStyleHandler(f);
    const result = (await handler({
      name: 'Heading/H1',
      fontName: { family: 'Inter', style: 'Bold' },
      fontSize: 32,
      lineHeight: { unit: 'PERCENT', value: 120 },
      letterSpacing: { unit: 'PIXELS', value: 0 },
    })) as StyleResult;

    expect(loaded).toEqual([
      { family: 'Inter', style: 'Bold' },
      { family: 'Inter', style: 'Bold' },
    ]);
    expect(style.fontName).toEqual({ family: 'Inter', style: 'Bold' });
    expect(style.fontSize).toBe(32);
    expect(style.lineHeight).toEqual({ unit: 'PERCENT', value: 120 });
    expect(style.letterSpacing).toEqual({ unit: 'PIXELS', value: 0 });
    expect(result).toEqual({ ok: true, styleId: 'S:0', name: 'Heading/H1' });
  });

  it("assigns a variable font's axis values onto the style and loads that exact font", async () => {
    const { figma: f, loaded, style } = fakeFigma();
    await createCreateTextStyleHandler(f)({
      name: 'Heading/H1',
      fontName: { family: 'Inter', style: 'Regular', variationSettings: { wght: 750 } },
    });
    expect(style.fontName).toEqual({
      family: 'Inter',
      style: 'Regular',
      variationSettings: { wght: 750 },
    });
    expect(loaded[0]).toEqual({
      family: 'Inter',
      style: 'Regular',
      variationSettings: { wght: 750 },
    });
  });

  it('rejects a malformed fontName before creating anything (no orphan style)', async () => {
    const { figma: f, createTextStyle } = fakeFigma();
    await expect(
      createCreateTextStyleHandler(f)({
        name: 'Heading/H1',
        fontName: { family: 'Inter', variationSettings: { wght: null } },
      }),
    ).rejects.toThrow(/variationSettings\.wght: Invalid input/);
    expect(createTextStyle).not.toHaveBeenCalled();
  });

  it("loads the style's own font before setting textWrapStyle (Figma rejects it otherwise)", async () => {
    const { figma: f, loaded, style } = fakeFigma();
    style.fontName = { family: 'Inter', style: 'Regular' };
    await createCreateTextStyleHandler(f)({ name: 'Heading/H1', textWrapStyle: 'BALANCE' });
    expect(style.textWrapStyle).toBe('BALANCE');
    expect(loaded).toEqual([{ family: 'Inter', style: 'Regular' }]);
  });

  it('loads the requested font before creating anything, so a bad font strands no style', async () => {
    const { figma: f, createTextStyle } = fakeFigma({ missingFont: 'Nonexistent Sans' });
    await expect(
      createCreateTextStyleHandler(f)({
        name: 'Heading/H1',
        fontName: { family: 'Nonexistent Sans', style: 'Bold' },
      }),
    ).rejects.toThrow(/Nonexistent Sans/);
    expect(createTextStyle).not.toHaveBeenCalled();
  });

  it('throws when name is missing', async () => {
    const { figma: f } = fakeFigma();
    const handler = createCreateTextStyleHandler(f);
    await expect(handler({ fontSize: 12 })).rejects.toThrow(/name/);
  });

  it('binds typography fields on the created style', async () => {
    const variable = { id: 'V:1', name: 'size/lg', resolvedType: 'FLOAT', valuesByMode: {} };
    const { figma: f, bound } = fakeFigma({}, { 'V:1': variable });
    await createCreateTextStyleHandler(f)({
      name: 'Heading/H1',
      fontName: { family: 'Inter', style: 'Bold' },
      boundVariables: { fontSize: 'V:1' },
    });
    expect(bound).toEqual([['fontSize', variable]]);
  });

  it('creates nothing when a binding cannot be resolved', async () => {
    const { figma: f, createTextStyle } = fakeFigma();
    await expect(
      createCreateTextStyleHandler(f)({
        name: 'Heading/H1',
        boundVariables: { fontSize: 'V:gone' },
      }),
    ).rejects.toThrow('create_text_style: variable V:gone not found');
    expect(createTextStyle).not.toHaveBeenCalled();
  });

  it('removes the style it created when the binding itself fails', async () => {
    const variable = { id: 'V:1', name: 'size/lg', resolvedType: 'FLOAT', valuesByMode: {} };
    const { figma: f, style, removed } = fakeFigma({}, { 'V:1': variable });
    style.fontName = { family: 'Inter', style: 'Regular' };
    style.setBoundVariable = () => {
      throw new Error('in setBoundVariable: unloaded font "Roboto Bold"');
    };
    await expect(
      createCreateTextStyleHandler(f)({ name: 'Heading/H1', boundVariables: { fontSize: 'V:1' } }),
    ).rejects.toThrow('unloaded font');
    expect(removed()).toBe(1);
  });

  it('loads the face a fontFamily binding will resolve to before binding it', async () => {
    const variable = {
      id: 'V:f',
      name: 'font/family',
      resolvedType: 'STRING',
      valuesByMode: { m1: 'Roboto' },
    };
    const { figma: f, loaded, style } = fakeFigma({}, { 'V:f': variable });
    style.fontName = { family: 'Inter', style: 'Regular' };
    await createCreateTextStyleHandler(f)({
      name: 'Heading/H1',
      boundVariables: { fontFamily: 'V:f' },
    });
    expect(loaded).toContainEqual({ family: 'Roboto', style: 'Regular' });
  });

  it('loads every mode of a bound family, not just the first', async () => {
    const variable = {
      id: 'V:f',
      name: 'font/family',
      resolvedType: 'STRING',
      valuesByMode: { m1: 'Roboto', m2: 'Lato' },
    };
    const { figma: f, loaded, style } = fakeFigma({}, { 'V:f': variable });
    style.fontName = { family: 'Inter', style: 'Regular' };
    await createCreateTextStyleHandler(f)({
      name: 'Heading/H1',
      boundVariables: { fontFamily: 'V:f' },
    });
    expect(loaded).toContainEqual({ family: 'Roboto', style: 'Regular' });
    expect(loaded).toContainEqual({ family: 'Lato', style: 'Regular' });
  });

  it('binds anyway when a mode names a font that cannot load', async () => {
    const variable = {
      id: 'V:f',
      name: 'font/family',
      resolvedType: 'STRING',
      valuesByMode: { m1: 'Roboto', m2: 'NoSuchFontFamilyXYZ' },
    };
    const {
      figma: f,
      loaded,
      style,
      bound,
    } = fakeFigma({ missingFont: 'NoSuchFontFamilyXYZ' }, { 'V:f': variable });
    style.fontName = { family: 'Inter', style: 'Regular' };
    await createCreateTextStyleHandler(f)({
      name: 'Heading/H1',
      boundVariables: { fontFamily: 'V:f' },
    });
    expect(loaded).toContainEqual({ family: 'Roboto', style: 'Regular' });
    expect(loaded).not.toContainEqual({ family: 'NoSuchFontFamilyXYZ', style: 'Regular' });
    expect(bound).toEqual([['fontFamily', variable]]);
  });

  it('asks for each face once when the family swap and the final face coincide', async () => {
    const variable = {
      id: 'V:f',
      name: 'font/family',
      resolvedType: 'STRING',
      valuesByMode: { m1: 'Roboto' },
    };
    const { figma: f, loaded, style } = fakeFigma({}, { 'V:f': variable });
    style.fontName = { family: 'Inter', style: 'Regular' };
    await createCreateTextStyleHandler(f)({
      name: 'Heading/H1',
      boundVariables: { fontFamily: 'V:f' },
    });
    expect(loaded.filter(fn => fn.family === 'Roboto')).toEqual([
      { family: 'Roboto', style: 'Regular' },
    ]);
  });

  it('walks family then style as a chain, loading the face each step lands on', async () => {
    const family = {
      id: 'V:f',
      name: 'font/family',
      resolvedType: 'STRING',
      valuesByMode: { m1: 'Roboto' },
    };
    const weight = {
      id: 'V:s',
      name: 'font/style',
      resolvedType: 'STRING',
      valuesByMode: { m1: 'Bold' },
    };
    const { figma: f, loaded, style } = fakeFigma({}, { 'V:f': family, 'V:s': weight });
    style.fontName = { family: 'Inter', style: 'Regular' };
    await createCreateTextStyleHandler(f)({
      name: 'Heading/H1',
      boundVariables: { fontFamily: 'V:f', fontStyle: 'V:s' },
    });
    expect(loaded).toContainEqual({ family: 'Roboto', style: 'Regular' });
    expect(loaded).toContainEqual({ family: 'Roboto', style: 'Bold' });
  });
});
