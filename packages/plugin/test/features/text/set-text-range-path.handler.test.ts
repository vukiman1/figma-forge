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

describe('set_text_range on text set along a path', () => {
  const onPath = () => ({ ...makeText(), type: 'TEXT_PATH' });

  it('styles the runs a path draws', async () => {
    const text = onPath();
    await createSetTextRangeHandler(makeFigma(text))({
      nodeId: text.id,
      ranges: [{ start: 0, end: 5, fontSize: 20, textCase: 'UPPER' }],
    });
    expect(text.setRangeFontSize).toHaveBeenCalledWith(0, 5, 20);
    expect(text.setRangeTextCase).toHaveBeenCalledWith(0, 5, 'UPPER');
  });

  it('refuses what a path takes and never draws, naming it, before any range is written', async () => {
    const text = onPath();
    await expect(
      createSetTextRangeHandler(makeFigma(text))({
        nodeId: text.id,
        ranges: [
          { start: 0, end: 5, fontSize: 20 },
          { start: 0, end: 2, textDecoration: 'UNDERLINE', boundVariables: { lineHeight: 'V:1' } },
        ],
      }),
    ).rejects.toThrow('is text on a path, which does not draw textDecoration, lineHeight');
    expect(text.setRangeFontSize).not.toHaveBeenCalled();
  });
});
