import type { StyleResult } from '@figma-forge/core';
import { describe, expect, it, vi } from 'vitest';

import { createUpdateTextStyleHandler } from '../../../src/features/styles/update-text-style.handler.js';

const fakeFigma = (
  style: Record<string, unknown> | null,
  variables: Record<string, unknown> = {},
): { figma: typeof figma; loaded: FontName[]; bound: [string, unknown][] } => {
  const loaded: FontName[] = [];
  const bound: [string, unknown][] = [];
  if (style !== null) {
    style.setBoundVariable = (field: string, variable: unknown) => bound.push([field, variable]);
  }
  const figmaCtx = {
    getStyleByIdAsync: async () => style,
    variables: { getVariableByIdAsync: async (id: string) => variables[id] ?? null },
    loadFontAsync: vi.fn<(fn: FontName) => Promise<void>>(async (fn: FontName) => {
      loaded.push(fn);
    }),
  } as unknown as typeof figma;
  return { figma: figmaCtx, loaded, bound };
};

describe('update_text_style handler', () => {
  it("assigns a variable font's axis values onto the style", async () => {
    const style: Record<string, unknown> = {
      id: 'S:0',
      type: 'TEXT',
      name: 'Body',
      fontName: { family: 'Inter', style: 'Regular' },
    };
    const { figma: f, loaded } = fakeFigma(style);
    await createUpdateTextStyleHandler(f)({
      styleId: 'S:0',
      fontName: { family: 'Inter', style: 'Regular', variationSettings: { wght: 300 } },
    });
    expect(style.fontName).toEqual({
      family: 'Inter',
      style: 'Regular',
      variationSettings: { wght: 300 },
    });
    expect(loaded[0]).toEqual({
      family: 'Inter',
      style: 'Regular',
      variationSettings: { wght: 300 },
    });
  });

  it('updates given fields (loading a new font first) and leaves omitted ones unchanged', async () => {
    const style: Record<string, unknown> = {
      id: 'S:0',
      type: 'TEXT',
      name: 'old',
      fontName: { family: 'Inter', style: 'Regular' },
      fontSize: 12,
      lineHeight: { unit: 'AUTO' },
      letterSpacing: { unit: 'PIXELS', value: 0 },
      description: 'keep',
    };
    const { figma: f, loaded } = fakeFigma(style);
    const result = (await createUpdateTextStyleHandler(f)({
      styleId: 'S:0',
      name: 'Heading/H1',
      fontName: { family: 'Inter', style: 'Bold' },
      fontSize: 32,
      lineHeight: { unit: 'PERCENT', value: 120 },
    })) as StyleResult;

    expect(loaded).toEqual([
      { family: 'Inter', style: 'Bold' },
      { family: 'Inter', style: 'Bold' },
    ]);
    expect(style.name).toBe('Heading/H1');
    expect(style.fontName).toEqual({ family: 'Inter', style: 'Bold' });
    expect(style.fontSize).toBe(32);
    expect(style.lineHeight).toEqual({ unit: 'PERCENT', value: 120 });
    expect(style.letterSpacing).toEqual({ unit: 'PIXELS', value: 0 });
    expect(style.description).toBe('keep');
    expect(result).toEqual({ ok: true, styleId: 'S:0', name: 'Heading/H1' });
  });

  it("updates textWrapStyle after loading the style's font, and leaves it alone when omitted", async () => {
    const style: Record<string, unknown> = {
      id: 'S:0',
      type: 'TEXT',
      name: 'Body',
      fontName: { family: 'Inter', style: 'Regular' },
      textWrapStyle: 'AUTO',
    };
    const { figma: f, loaded } = fakeFigma(style);
    await createUpdateTextStyleHandler(f)({ styleId: 'S:0', textWrapStyle: 'PRETTY' });
    expect(style.textWrapStyle).toBe('PRETTY');
    expect(loaded).toEqual([{ family: 'Inter', style: 'Regular' }]);

    await createUpdateTextStyleHandler(f)({ styleId: 'S:0', fontSize: 18 });
    expect(style.textWrapStyle).toBe('PRETTY');
  });

  it("loads the style's own font even for a numeric-only update (fontName omitted)", async () => {
    const style: Record<string, unknown> = {
      id: 'S:0',
      type: 'TEXT',
      name: 'x',
      fontName: { family: 'Inter', style: 'Regular' },
      fontSize: 12,
    };
    const { figma: f, loaded } = fakeFigma(style);
    await createUpdateTextStyleHandler(f)({ styleId: 'S:0', fontSize: 16 });
    expect(loaded).toEqual([{ family: 'Inter', style: 'Regular' }]);
    expect(style.fontSize).toBe(16);
  });

  it('throws when the style is missing or not a text style', async () => {
    await expect(
      createUpdateTextStyleHandler(fakeFigma(null).figma)({ styleId: 'S:9' }),
    ).rejects.toThrow(/not found/);
    await expect(
      createUpdateTextStyleHandler(fakeFigma({ id: 'S:0', type: 'PAINT' }).figma)({
        styleId: 'S:0',
      }),
    ).rejects.toThrow(/not found/);
    await expect(createUpdateTextStyleHandler(fakeFigma(null).figma)({})).rejects.toThrow(
      /styleId/,
    );
  });

  it('binds typography fields, and unbinds one passed as null', async () => {
    const variable = { id: 'V:1', name: 'size/lg', resolvedType: 'FLOAT', valuesByMode: {} };
    const style: Record<string, unknown> = {
      id: 'S:0',
      type: 'TEXT',
      name: 'Body',
      fontName: { family: 'Inter', style: 'Regular' },
    };
    const { figma: f, bound } = fakeFigma(style, { 'V:1': variable });
    await createUpdateTextStyleHandler(f)({
      styleId: 'S:0',
      boundVariables: { fontSize: 'V:1', lineHeight: null },
    });
    expect(bound).toEqual([
      ['fontSize', variable],
      ['lineHeight', null],
    ]);
  });

  it('applies bindings after literals, so a bound field wins over one set in the same call', async () => {
    const variable = { id: 'V:1', name: 'size/lg', resolvedType: 'FLOAT', valuesByMode: {} };
    const style: Record<string, unknown> = {
      id: 'S:0',
      type: 'TEXT',
      name: 'Body',
      fontName: { family: 'Inter', style: 'Regular' },
      fontSize: 12,
    };
    const { figma: f, bound } = fakeFigma(style, { 'V:1': variable });
    await createUpdateTextStyleHandler(f)({
      styleId: 'S:0',
      fontSize: 99,
      boundVariables: { fontSize: 'V:1' },
    });
    expect(style.fontSize).toBe(99);
    expect(bound).toEqual([['fontSize', variable]]);
  });

  it('leaves the style untouched when a binding cannot be resolved', async () => {
    const style: Record<string, unknown> = {
      id: 'S:0',
      type: 'TEXT',
      name: 'Body',
      fontName: { family: 'Inter', style: 'Regular' },
    };
    const { figma: f, bound } = fakeFigma(style);
    await expect(
      createUpdateTextStyleHandler(f)({ styleId: 'S:0', boundVariables: { fontSize: 'V:gone' } }),
    ).rejects.toThrow('update_text_style: variable V:gone not found');
    expect(bound).toEqual([]);
  });
});
