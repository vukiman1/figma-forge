import { describe, expect, it, vi } from 'vitest';

import { serializeFlat, serializeFlatSync } from '../../src/serialize/serialize-node.js';
import { fake } from './serialize-fake.js';

describe('Figma Draw nodes', () => {
  const at = (x: number, y: number) => [
    [1, 0, x],
    [0, 1, y],
  ];

  it('reads a repeat group: its modifiers, every copy, and the box the copies paint into', () => {
    const out = serializeFlatSync(
      fake({
        type: 'TRANSFORM_GROUP',
        x: 20,
        y: 20,
        width: 72,
        height: 24,
        absoluteTransform: at(20, 20),
        absoluteBoundingBox: { x: 20, y: 20, width: 72, height: 24 },
        absoluteRenderBounds: { x: 20, y: 20, width: 72, height: 24 },
        transformModifiers: [
          {
            type: 'REPEAT',
            repeatType: 'LINEAR',
            axis: 'HORIZONTAL',
            unitType: 'RELATIVE',
            offset: 0.5,
            count: 5,
          },
        ],
        children: [{ width: 24, height: 24, absoluteTransform: at(20, 20) }],
      }),
    );
    expect(out.transformModifiers).toEqual([
      {
        type: 'REPEAT',
        repeatType: 'LINEAR',
        axis: 'HORIZONTAL',
        unitType: 'RELATIVE',
        offset: 0.5,
        count: 5,
      },
    ]);
    expect(out.repeatTransforms).toEqual([
      'translate(12px, 0px)',
      'translate(24px, 0px)',
      'translate(36px, 0px)',
      'translate(48px, 0px)',
    ]);
    expect(out.renderBounds).toBeUndefined();
  });

  it('reads a repeat group inside an instance off its main component’s node, which keeps them', async () => {
    const modifiers = [
      { type: 'REPEAT', repeatType: 'RADIAL', unitType: 'PIXELS', offset: 40, count: 4 },
    ];
    const getNodeByIdAsync = vi.fn<(id: string) => Promise<unknown>>(async id =>
      id === '16:1183' ? { type: 'TRANSFORM_GROUP', transformModifiers: modifiers } : null,
    );
    vi.stubGlobal('figma', { getNodeByIdAsync });
    try {
      const group = (id: string) =>
        fake({
          id,
          type: 'TRANSFORM_GROUP',
          width: 20,
          height: 20,
          absoluteTransform: at(0, 0),
          absoluteBoundingBox: { x: 0, y: 0, width: 20, height: 20 },
          absoluteRenderBounds: { x: 0, y: 0, width: 20, height: 20 },
          transformModifiers: [],
          children: [{ width: 20, height: 20, absoluteTransform: at(0, 0) }],
        });
      const inInstance = await serializeFlat(group('I16:1186;16:1183'));
      expect(getNodeByIdAsync).toHaveBeenCalledWith('16:1183');
      expect(inInstance.transformModifiers).toEqual(modifiers);
      expect(inInstance.repeatTransforms).toHaveLength(3);
      getNodeByIdAsync.mockClear();
      expect((await serializeFlat(group('5:5'))).transformModifiers).toBeUndefined();
      expect(getNodeByIdAsync).not.toHaveBeenCalled();
      getNodeByIdAsync.mockRejectedValueOnce(new Error('library not loaded'));
      expect((await serializeFlat(group('I1:1;2:2'))).transformModifiers).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('reads text set along a path, with no corner radius it never draws', () => {
    const getStyledTextSegments = vi.fn<() => unknown[]>(() => []);
    const out = serializeFlatSync(
      fake({
        type: 'TEXT_PATH',
        width: 200,
        height: 200,
        cornerRadius: Symbol('mixed'),
        fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
        characters: 'Round and round',
        fontSize: 18,
        fontName: { family: 'Inter', style: 'Bold' },
        letterSpacing: { unit: 'PERCENT', value: 8 },
        textCase: 'UPPER',
        textAlignHorizontal: 'CENTER',
        textAlignVertical: 'BOTTOM',
        hyperlink: null,
        textPathStartData: { segment: 3, position: 0.5 },
        absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 200 },
        absoluteRenderBounds: { x: -10, y: -12, width: 220, height: 160 },
        getStyledTextSegments,
      }),
    );
    expect(out).toMatchObject({
      characters: 'Round and round',
      fontSize: 18,
      fontName: { family: 'Inter', style: 'Bold' },
      letterSpacing: { unit: 'PERCENT', value: 8 },
      textCase: 'UPPER',
      textAlignHorizontal: 'CENTER',
      textAlignVertical: 'BOTTOM',
      textPathStartData: { segment: 3, position: 0.5 },
      renderBounds: { x: -10, y: -12, width: 220, height: 160 },
    });
    for (const absent of [
      'cornerRadius',
      'lineHeight',
      'textDecoration',
      'textAutoResize',
      'segments',
    ]) {
      expect(out).not.toHaveProperty(absent);
    }
    expect(getStyledTextSegments).not.toHaveBeenCalled();
  });

  it('omits a path’s start at its very beginning', () => {
    const out = serializeFlatSync(
      fake({
        type: 'TEXT_PATH',
        characters: 'x',
        fontSize: 12,
        fontName: { family: 'Inter', style: 'Regular' },
        letterSpacing: { unit: 'PERCENT', value: 0 },
        textCase: 'ORIGINAL',
        textAlignHorizontal: 'LEFT',
        textAlignVertical: 'TOP',
        hyperlink: null,
        textPathStartData: { segment: 0, position: 0 },
      }),
    );
    expect(out).not.toHaveProperty('textPathStartData');
  });

  it('splits mixed text on a path only on what it draws, and never reports a decoration', () => {
    const getStyledTextSegments = vi.fn<(fields: string[]) => unknown[]>(fields => {
      void fields;
      return [
        {
          characters: 'Ro',
          start: 0,
          end: 2,
          fontName: { family: 'Inter', style: 'Bold' },
          fontSize: 18,
          fills: [],
          textCase: 'ORIGINAL',
          letterSpacing: { unit: 'PERCENT', value: 0 },
        },
        {
          characters: 'und',
          start: 2,
          end: 5,
          fontName: { family: 'Inter', style: 'Regular' },
          fontSize: 18,
          fills: [],
          textCase: 'ORIGINAL',
          letterSpacing: { unit: 'PERCENT', value: 0 },
        },
      ];
    });
    const out = serializeFlatSync(
      fake({
        type: 'TEXT_PATH',
        characters: 'Round',
        fontSize: 18,
        fontName: Symbol('mixed'),
        letterSpacing: { unit: 'PERCENT', value: 0 },
        textCase: 'ORIGINAL',
        textAlignHorizontal: 'LEFT',
        textAlignVertical: 'TOP',
        hyperlink: null,
        textPathStartData: { segment: 0, position: 0 },
        getStyledTextSegments,
      }),
    );
    const asked = getStyledTextSegments.mock.calls[0]![0];
    for (const notDrawn of [
      'textDecoration',
      'lineHeight',
      'listOptions',
      'indentation',
      'textWrapStyle',
    ]) {
      expect(asked).not.toContain(notDrawn);
    }
    expect(out.segments?.map(seg => [seg.characters, seg.textDecoration])).toEqual([
      ['Ro', 'NONE'],
      ['und', 'NONE'],
    ]);
  });

  const stroked = (over: Record<string, unknown>) =>
    serializeFlatSync(
      fake({
        type: 'VECTOR',
        strokes: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
        strokeWeight: 8,
        dashPattern: [10, 5],
        absoluteBoundingBox: { x: 0, y: 0, width: 10, height: 10 },
        absoluteRenderBounds: { x: -4, y: -30, width: 18, height: 70 },
        complexStrokeProperties: { type: 'BASIC' },
        variableWidthStrokeProperties: { widthProfile: 'UNIFORM', variableWidthPoints: [] },
        ...over,
      }),
    );

  it('reads a brush, dynamic or width-profile stroke, its painted box, and drops the dashes it hides', () => {
    const out = stroked({
      complexStrokeProperties: { type: 'DYNAMIC', frequency: 5, wiggle: 10, smoothen: 0.5 },
      variableWidthStrokeProperties: {
        widthProfile: 'TAPER',
        variableWidthPoints: [
          { position: 0, width: 0.5 },
          { position: 1, width: 0.1875 },
        ],
      },
    });
    expect(out.complexStrokeProperties).toEqual({
      type: 'DYNAMIC',
      frequency: 5,
      wiggle: 10,
      smoothen: 0.5,
    });
    expect(out.variableWidthStrokeProperties?.widthProfile).toBe('TAPER');
    expect(out.renderBounds).toEqual({ x: -4, y: -30, width: 18, height: 70 });
    expect(out).not.toHaveProperty('dashPattern');
  });

  it('leaves a plain stroke exactly as it was', () => {
    const out = stroked({});
    expect(out).not.toHaveProperty('complexStrokeProperties');
    expect(out).not.toHaveProperty('variableWidthStrokeProperties');
    expect(out).not.toHaveProperty('renderBounds');
    expect(out.dashPattern).toEqual([10, 5]);
  });

  it('reads no Draw stroke where there is no stroke for it to shape, though its properties survive strokes = []', () => {
    const out = stroked({
      strokes: [],
      complexStrokeProperties: {
        type: 'BRUSH',
        brushType: 'STRETCH',
        brushName: 'HEIST',
        direction: 'FORWARD',
      },
    });
    expect(out).not.toHaveProperty('complexStrokeProperties');
    expect(out).not.toHaveProperty('renderBounds');
  });
});
