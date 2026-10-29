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

describe('set_text_range handler — runs', () => {
  it('binds shared styles (async) and a non-paint variable field via setRangeBoundVariable', async () => {
    const text = makeText();
    const variable = { id: 'VariableID:size', name: 'font/lg' };
    await createSetTextRangeHandler(makeFigma(text, { 'VariableID:size': variable }))({
      nodeId: 'T:1',
      ranges: [
        {
          start: 9,
          end: 14,
          textStyleId: 'S:link',
          fillStyleId: 'S:brand',
          boundVariables: { fontSize: 'VariableID:size' },
        },
      ],
    });
    expect(text.setRangeTextStyleIdAsync).toHaveBeenCalledWith(9, 14, 'S:link');
    expect(text.setRangeFillStyleIdAsync).toHaveBeenCalledWith(9, 14, 'S:brand');
    expect(text.setRangeBoundVariable).toHaveBeenCalledWith(9, 14, 'fontSize', variable);
  });

  it('binds a COLOR variable on `fills` through the paint (setRangeBoundVariable rejects fills)', async () => {
    const text = makeText();
    const variable = { id: 'VariableID:primary', name: 'Primary/500' };
    const figma = makeFigma(text, { 'VariableID:primary': variable });
    await createSetTextRangeHandler(figma)({
      nodeId: 'T:1',
      ranges: [{ start: 9, end: 14, boundVariables: { fills: 'VariableID:primary' } }],
    });
    expect(text.setRangeBoundVariable).not.toHaveBeenCalled();
    expect(figma.variables.setBoundVariableForPaint).toHaveBeenCalledWith(
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
      'color',
      variable,
    );
    expect(text.setRangeFills).toHaveBeenCalledWith(9, 14, [
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: variable } },
    ]);
  });

  it('unbinds a colour variable on `fills` when the id is null', async () => {
    const text = makeText();
    const figma = makeFigma(text);
    await createSetTextRangeHandler(figma)({
      nodeId: 'T:1',
      ranges: [{ start: 0, end: 5, boundVariables: { fills: null } }],
    });
    expect(figma.variables.setBoundVariableForPaint).toHaveBeenCalledWith(
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
      'color',
      null,
    );
  });

  it('applies multiple ranges in order', async () => {
    const text = makeText();
    await createSetTextRangeHandler(makeFigma(text))({
      nodeId: 'T:1',
      ranges: [
        { start: 0, end: 9, fontSize: 14 },
        { start: 9, end: 14, fontSize: 18 },
      ],
    });
    expect(text.setRangeFontSize).toHaveBeenNthCalledWith(1, 0, 9, 14);
    expect(text.setRangeFontSize).toHaveBeenNthCalledWith(2, 9, 14, 18);
  });

  it('rejects a non-TEXT node, bad ranges, and out-of-bounds / empty ranges', async () => {
    const text = makeText('short');
    const figma = makeFigma(text);
    const notText = {
      getNodeByIdAsync: async () => ({ id: 'R:1', type: 'RECTANGLE' }),
    } as unknown as typeof figma;

    await expect(createSetTextRangeHandler(notText)({ nodeId: 'R:1', ranges: [] })).rejects.toThrow(
      /not a TEXT node/,
    );
    await expect(createSetTextRangeHandler(figma)({ nodeId: 'T:1' })).rejects.toThrow(
      /ranges: Invalid input: expected array/,
    );
    await expect(
      createSetTextRangeHandler(figma)({ nodeId: 'T:1', ranges: [{ start: 0, end: 99 }] }),
    ).rejects.toThrow(/out of bounds/);
    await expect(
      createSetTextRangeHandler(figma)({ nodeId: 'T:1', ranges: [{ start: 3, end: 3 }] }),
    ).rejects.toThrow(/out of bounds or empty/);
  });

  it('throws a clear error when a bound variable id does not resolve', async () => {
    const text = makeText();
    await expect(
      createSetTextRangeHandler(makeFigma(text))({
        nodeId: 'T:1',
        ranges: [{ start: 0, end: 5, boundVariables: { fills: 'VariableID:missing' } }],
      }),
    ).rejects.toThrow(/variable VariableID:missing not found/);
  });

  it('carries a binding on a run fill through to setRangeFills', async () => {
    const text = makeText();
    const variable = { id: 'V:1', name: 'color/link', resolvedType: 'COLOR' };
    const figma = makeFigma(text, { 'V:1': variable });
    await createSetTextRangeHandler(figma)({
      nodeId: 'T:1',
      ranges: [
        {
          start: 0,
          end: 5,
          fills: [
            {
              type: 'SOLID',
              visible: true,
              opacity: 1,
              color: { r: 0, g: 0, b: 1 },
              boundVariables: { color: 'V:1' },
            },
          ],
        },
      ],
    });
    expect(text.setRangeFills).toHaveBeenCalledWith(0, 5, [
      expect.objectContaining({ boundVariables: { color: variable } }),
    ]);
  });

  it('rejects a run fill bound to a variable that no longer exists', async () => {
    const text = makeText();
    const figma = makeFigma(text);
    await expect(
      createSetTextRangeHandler(figma)({
        nodeId: 'T:1',
        ranges: [
          {
            start: 0,
            end: 5,
            fills: [
              {
                type: 'SOLID',
                visible: true,
                opacity: 1,
                color: { r: 0, g: 0, b: 1 },
                boundVariables: { color: 'V:gone' },
              },
            ],
          },
        ],
      }),
    ).rejects.toThrow('set_text_range: variable V:gone not found');
    expect(text.setRangeFills).not.toHaveBeenCalled();
  });
});
