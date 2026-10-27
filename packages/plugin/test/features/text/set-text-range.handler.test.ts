import type { MutateResult } from '@figma-forge/core';
import { describe, expect, it, vi } from 'vitest';

import { createSetTextRangeHandler } from '../../../src/features/text/set-text-range.handler.js';

type Spy = (...args: unknown[]) => void;
type AsyncSpy = (...args: unknown[]) => Promise<void>;

const makeText = (characters = 'Agree to Terms') => ({
  id: 'T:1',
  type: 'TEXT',
  characters,
  fontName: { family: 'Inter', style: 'Regular' },
  getRangeAllFontNames: vi.fn<() => { family: string; style: string }[]>(
    () =>
      Object.freeze([{ family: 'Inter', style: 'Regular' }]) as { family: string; style: string }[],
  ),
  setRangeFontName: vi.fn<Spy>(),
  setRangeFontSize: vi.fn<Spy>(),
  setRangeTextDecoration: vi.fn<Spy>(),
  setRangeTextCase: vi.fn<Spy>(),
  setRangeLineHeight: vi.fn<Spy>(),
  setRangeLetterSpacing: vi.fn<Spy>(),
  setRangeHyperlink: vi.fn<Spy>(),
  setRangeListOptions: vi.fn<Spy>(),
  setRangeIndentation: vi.fn<Spy>(),
  setRangeTextWrapStyle: vi.fn<Spy>(),
  setRangeTextStyleIdAsync: vi.fn<AsyncSpy>(async () => {}),
  setRangeFillStyleIdAsync: vi.fn<AsyncSpy>(async () => {}),
  setRangeBoundVariable: vi.fn<Spy>(),
  getRangeFills: vi.fn<() => unknown>(() => [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]),
  setRangeFills: vi.fn<Spy>(),
});

const makeFigma = (
  text: ReturnType<typeof makeText> | null,
  variables: Record<string, unknown> = {},
): typeof figma =>
  ({
    getNodeByIdAsync: async (id: string) => (text && id === text.id ? text : null),
    loadFontAsync: vi.fn<AsyncSpy>(async () => {}),
    variables: {
      getVariableByIdAsync: async (id: string) => variables[id] ?? null,
      setBoundVariableForPaint: vi.fn<(...a: unknown[]) => unknown>(
        (paint: unknown, _field: unknown, variable: unknown) => ({
          ...(paint as object),
          boundVariables: { color: variable },
        }),
      ),
    },
  }) as unknown as typeof figma;

describe('set_text_range handler', () => {
  it("carries a run's variable-font axis values into setRangeFontName", async () => {
    const text = makeText();
    const figma = makeFigma(text);
    await createSetTextRangeHandler(figma)({
      nodeId: 'T:1',
      ranges: [
        {
          start: 9,
          end: 14,
          fontName: { family: 'Inter', style: 'Regular', variationSettings: { wght: 700 } },
        },
      ],
    });
    expect(text.setRangeFontName).toHaveBeenCalledWith(9, 14, {
      family: 'Inter',
      style: 'Regular',
      variationSettings: { wght: 700 },
    });
  });

  it('loads a variable face once per family + style, not once per axis value', async () => {
    const text = makeText();
    const figma = makeFigma(text);
    await createSetTextRangeHandler(figma)({
      nodeId: 'T:1',
      ranges: [
        {
          start: 0,
          end: 5,
          fontName: { family: 'Inter', style: 'Regular', variationSettings: { wght: 400 } },
        },
        {
          start: 5,
          end: 9,
          fontName: { family: 'Inter', style: 'Regular', variationSettings: { wght: 700 } },
        },
      ],
    });
    expect(figma.loadFontAsync).toHaveBeenCalledTimes(1);
  });

  it('rejects a malformed fontName before any range is written', async () => {
    const text = makeText();
    const figma = makeFigma(text);
    await expect(
      createSetTextRangeHandler(figma)({
        nodeId: 'T:1',
        ranges: [
          { start: 0, end: 5, fontSize: 12 },
          { start: 5, end: 9, fontName: { family: 'Inter', variationSettings: { wght: 'bold' } } },
        ],
      }),
    ).rejects.toThrow(/variationSettings\.wght: Invalid input/);
    expect(text.setRangeFontSize).not.toHaveBeenCalled();
  });

  it('applies visual + spacing props to a range and loads the fonts first', async () => {
    const text = makeText();
    const figma = makeFigma(text);
    const result = (await createSetTextRangeHandler(figma)({
      nodeId: 'T:1',
      ranges: [
        {
          start: 9,
          end: 14,
          fontName: { family: 'Inter', style: 'Bold' },
          fontSize: 16,
          fills: [{ type: 'SOLID', color: { r: 0, g: 0.4, b: 1 } }],
          textDecoration: 'UNDERLINE',
          textCase: 'UPPER',
          lineHeight: { unit: 'PIXELS', value: 22 },
          letterSpacing: { unit: 'PERCENT', value: 2 },
        },
      ],
    })) as MutateResult;

    expect(figma.loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Regular' });
    expect(figma.loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Bold' });
    expect(text.setRangeFontName).toHaveBeenCalledWith(9, 14, { family: 'Inter', style: 'Bold' });
    expect(text.setRangeFontSize).toHaveBeenCalledWith(9, 14, 16);
    expect(text.setRangeFills).toHaveBeenCalledWith(9, 14, [
      { type: 'SOLID', color: { r: 0, g: 0.4, b: 1 }, opacity: undefined, visible: undefined },
    ]);
    expect(text.setRangeTextDecoration).toHaveBeenCalledWith(9, 14, 'UNDERLINE');
    expect(text.setRangeTextCase).toHaveBeenCalledWith(9, 14, 'UPPER');
    expect(text.setRangeLineHeight).toHaveBeenCalledWith(9, 14, { unit: 'PIXELS', value: 22 });
    expect(text.setRangeLetterSpacing).toHaveBeenCalledWith(9, 14, { unit: 'PERCENT', value: 2 });
    expect(result).toEqual({ ok: true, nodeId: 'T:1' });
  });

  it('applies structural props: hyperlink, list options, indentation', async () => {
    const text = makeText();
    await createSetTextRangeHandler(makeFigma(text))({
      nodeId: 'T:1',
      ranges: [
        {
          start: 9,
          end: 14,
          hyperlink: { type: 'URL', value: 'https://x.dev/terms' },
          listOptions: 'ORDERED',
          indentation: 1,
        },
      ],
    });
    expect(text.setRangeHyperlink).toHaveBeenCalledWith(9, 14, {
      type: 'URL',
      value: 'https://x.dev/terms',
    });
    expect(text.setRangeListOptions).toHaveBeenCalledWith(9, 14, { type: 'ORDERED' });
    expect(text.setRangeIndentation).toHaveBeenCalledWith(9, 14, 1);
  });

  it('applies textWrapStyle to the range (paragraph-scoped, unlike the per-character props)', async () => {
    const text = makeText();
    await createSetTextRangeHandler(makeFigma(text))({
      nodeId: 'T:1',
      ranges: [{ start: 9, end: 14, textWrapStyle: 'BALANCE' }],
    });
    expect(text.setRangeTextWrapStyle).toHaveBeenCalledWith(9, 14, 'BALANCE');
  });

  it('clears a hyperlink when passed null', async () => {
    const text = makeText();
    await createSetTextRangeHandler(makeFigma(text))({
      nodeId: 'T:1',
      ranges: [{ start: 0, end: 5, hyperlink: null }],
    });
    expect(text.setRangeHyperlink).toHaveBeenCalledWith(0, 5, null);
  });
});
