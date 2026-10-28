import { MIXED } from '@figma-forge/core';
import { describe, expect, it, vi } from 'vitest';

import { serializeFlatSync } from '../../src/serialize/serialize-node.js';
import { fake } from './serialize-fake.js';

describe('serializeFlat — typography', () => {
  it('captures alignment / lineHeight / letterSpacing / case / decoration', () => {
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'Hi',
        fontSize: 14,
        fontName: { family: 'Inter', style: 'Regular' },
        textAlignHorizontal: 'CENTER',
        textAlignVertical: 'TOP',
        lineHeight: { unit: 'PIXELS', value: 20 },
        letterSpacing: { unit: 'PERCENT', value: 2 },
        textCase: 'UPPER',
        textDecoration: 'UNDERLINE',
      }),
    );
    expect(out.textAlignHorizontal).toBe('CENTER');
    expect(out.textAlignVertical).toBe('TOP');
    expect(out.lineHeight).toEqual({ unit: 'PIXELS', value: 20 });
    expect(out.letterSpacing).toEqual({ unit: 'PERCENT', value: 2 });
    expect(out.textCase).toBe('UPPER');
    expect(out.textDecoration).toBe('UNDERLINE');
  });

  it('serializes AUTO lineHeight and marks mixed values', () => {
    expect(
      serializeFlatSync(fake({ type: 'TEXT', characters: 'a', lineHeight: { unit: 'AUTO' } }))
        .lineHeight,
    ).toEqual({
      unit: 'AUTO',
    });
    const mixed = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'a',
        lineHeight: Symbol('figma.mixed'),
        textCase: Symbol('m'),
      }),
    );
    expect(mixed.lineHeight).toBe(MIXED);
    expect(mixed.textCase).toBe(MIXED);
  });

  it("derives cssAngle for a gradient text run from the TEXT node's own size", () => {
    const gradient = {
      type: 'GRADIENT_LINEAR',
      visible: true,
      opacity: 1,
      gradientStops: [
        { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
        { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
      ],
      gradientTransform: [
        [0.5, 0.5, 0],
        [0, 1, 0],
      ],
    };
    const segments = [
      {
        characters: 'A',
        start: 0,
        end: 1,
        fontName: { family: 'Inter', style: 'Regular' },
        fontSize: 20,
        fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
        textDecoration: 'NONE',
        textCase: 'ORIGINAL',
      },
      {
        characters: 'B',
        start: 1,
        end: 2,
        fontName: { family: 'Inter', style: 'Regular' },
        fontSize: 20,
        fills: [gradient],
        textDecoration: 'NONE',
        textCase: 'ORIGINAL',
      },
    ];
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        width: 400,
        height: 100,
        characters: 'AB',
        fills: MIXED,
        getStyledTextSegments: () => segments,
      }),
    );
    const runFills = out.segments?.[1]?.fills as readonly { cssAngle?: number }[] | undefined;
    expect(runFills?.[0]?.cssAngle).toBe(165.96);
  });

  it('expands per-run segments only for mixed-style text', () => {
    const segments = [
      {
        characters: 'A',
        start: 0,
        end: 1,
        fontName: { family: 'Inter', style: 'Regular' },
        fontSize: 14,
        fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
        textDecoration: 'NONE',
        textCase: 'ORIGINAL',
      },
      {
        characters: 'B',
        start: 1,
        end: 2,
        fontName: { family: 'Inter', style: 'Bold' },
        fontSize: 20,
        fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 1 } }],
        textDecoration: 'UNDERLINE',
        textCase: 'ORIGINAL',
      },
    ];
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'AB',
        fontSize: Symbol('figma.mixed'),
        fontName: { family: 'Inter', style: 'Regular' },
        getStyledTextSegments: () => segments,
      }),
    );
    expect(out.segments).toHaveLength(2);
    expect(out.segments?.[1]).toMatchObject({
      characters: 'B',
      fontName: { family: 'Inter', style: 'Bold' },
      fontSize: 20,
      textDecoration: 'UNDERLINE',
    });
    expect(out.segments?.[1]?.fills).toEqual([
      { type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 1 } },
    ]);
  });

  it("carries a variable font's axis values onto each per-run segment", () => {
    const segments = [
      {
        characters: 'A',
        start: 0,
        end: 1,
        fontName: { family: 'Inter', style: 'Regular', variationSettings: { wght: 400 } },
        fontSize: 14,
        fills: [],
        textDecoration: 'NONE',
        textCase: 'ORIGINAL',
      },
      {
        characters: 'B',
        start: 1,
        end: 2,
        fontName: { family: 'Inter', style: 'Regular', variationSettings: { wght: 700 } },
        fontSize: 14,
        fills: [],
        textDecoration: 'NONE',
        textCase: 'ORIGINAL',
      },
    ];
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'AB',
        fontSize: 14,
        fontName: Symbol('figma.mixed'),
        getStyledTextSegments: () => segments,
      }),
    );
    expect(out.segments?.map(seg => seg.fontName)).toEqual([
      { family: 'Inter', style: 'Regular', variationSettings: { wght: 400 } },
      { family: 'Inter', style: 'Regular', variationSettings: { wght: 700 } },
    ]);
  });

  it('omits segments for uniform text', () => {
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'Hi',
        fontSize: 14,
        fontName: { family: 'Inter', style: 'Regular' },
        textCase: 'ORIGINAL',
        textDecoration: 'NONE',
        getStyledTextSegments: () => [],
      }),
    );
    expect(out.segments).toBeUndefined();
  });

  it('asks Figma for every per-run field the segment output can carry', () => {
    const getStyledTextSegments = vi.fn<(fields: readonly string[]) => unknown[]>(() => []);
    serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'AB',
        fontSize: Symbol('figma.mixed'),
        fontName: { family: 'Inter', style: 'Regular' },
        getStyledTextSegments,
      }),
    );
    expect(getStyledTextSegments.mock.calls[0]?.[0]).toEqual([
      'fontName',
      'fontSize',
      'fills',
      'textDecoration',
      'textCase',
      'lineHeight',
      'letterSpacing',
      'hyperlink',
      'listOptions',
      'indentation',
      'textWrapStyle',
      'textStyleId',
      'fillStyleId',
      'boundVariables',
    ]);
  });

  it('emits a uniform textWrapStyle node-level, without expanding segments', () => {
    const out = serializeFlatSync(
      fake({
        type: 'TEXT',
        characters: 'A balanced heading',
        fontSize: 24,
        fontName: { family: 'Inter', style: 'Bold' },
        textCase: 'ORIGINAL',
        textDecoration: 'NONE',
        textWrapStyle: 'BALANCE',
        getStyledTextSegments: () => [],
      }),
    );
    expect(out.textWrapStyle).toBe('BALANCE');
    expect(out.segments).toBeUndefined();
  });
});
