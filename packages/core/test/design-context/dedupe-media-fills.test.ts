import { describe, expect, it } from 'vitest';

import { dedupeStyles } from '../../src/index.js';

describe('dedupeStyles — image, pattern and shader fills', () => {
  it('carries a CROP fill’s matrix and its ready CSS, keeping different crops apart', () => {
    const crop = (c: number, css: string) => ({
      type: 'IMAGE',
      visible: true,
      opacity: 1,
      scaleMode: 'CROP',
      imageTransform: [
        [0.5, 0, c],
        [0, 0.5, 0.25],
      ],
      cssTransform: css,
    });
    const { nodes, globalVars } = dedupeStyles([
      {
        id: 'a',
        name: 'a',
        type: 'RECTANGLE',
        fills: [crop(0.25, 'translate(-50%, -50%) scale(2, 2)')],
      },
      {
        id: 'b',
        name: 'b',
        type: 'RECTANGLE',
        fills: [crop(0, 'translate(0%, -50%) scale(2, 2)')],
      },
    ] as never);
    expect(nodes[0]!.fill).not.toBe(nodes[1]!.fill);
    expect(globalVars.styles[nodes[0]!.fill!]).toEqual([
      {
        type: 'IMAGE',
        scaleMode: 'CROP',
        imageTransform: [
          [0.5, 0, 0.25],
          [0, 0.5, 0.25],
        ],
        cssTransform: 'translate(-50%, -50%) scale(2, 2)',
      },
    ]);
  });

  it('carries filtersApplied on an IMAGE fill (the export-the-composited-render signal)', () => {
    const { nodes, globalVars } = dedupeStyles([
      {
        id: 'a',
        name: 'a',
        type: 'RECTANGLE',
        fills: [
          { type: 'IMAGE', visible: true, opacity: 1, scaleMode: 'FILL', filtersApplied: true },
        ],
      },
      {
        id: 'b',
        name: 'b',
        type: 'RECTANGLE',
        fills: [{ type: 'IMAGE', visible: true, opacity: 1, scaleMode: 'FILL' }],
      },
    ]);
    expect(globalVars.styles[nodes[0]!.fill!]).toEqual([
      { type: 'IMAGE', scaleMode: 'FILL', filtersApplied: true },
    ]);
    expect(globalVars.styles[nodes[1]!.fill!]).toEqual([{ type: 'IMAGE', scaleMode: 'FILL' }]);
  });

  it('carries the tiling geometry on a PATTERN fill (source node + repeat)', () => {
    const { nodes, globalVars } = dedupeStyles([
      {
        id: 'a',
        name: 'a',
        type: 'RECTANGLE',
        fills: [
          {
            type: 'PATTERN',
            visible: true,
            opacity: 1,
            sourceNodeId: '12:34',
            tileType: 'RECTANGULAR',
            scalingFactor: 0.5,
            spacing: { x: 4, y: 8 },
            horizontalAlignment: 'CENTER',
          },
        ],
      },
    ]);
    expect(globalVars.styles[nodes[0]!.fill!]).toEqual([
      {
        type: 'PATTERN',
        sourceNodeId: '12:34',
        tileType: 'RECTANGULAR',
        scalingFactor: 0.5,
        spacing: { x: 4, y: 8 },
        horizontalAlignment: 'CENTER',
      },
    ]);
  });

  it('carries a SHADER fill by name, with every colour in its values as hex', () => {
    const { nodes, globalVars } = dedupeStyles([
      {
        id: 'a',
        name: 'a',
        type: 'RECTANGLE',
        fills: [
          {
            type: 'SHADER',
            visible: true,
            opacity: 1,
            shaderId: 'shader:mesh',
            shaderProperties: [
              { id: 'd1', name: 'Tint', type: 'COLOR', value: { r: 1, g: 0, b: 0, a: 0.5 } },
              {
                id: 'd2',
                name: 'Spot',
                type: 'COLOR_POINT',
                value: { x: 0.5, y: 0.5, color: { r: 0, g: 0, b: 1 } },
              },
              {
                id: 'd3',
                name: 'Ramp',
                type: 'GRADIENT',
                value: {
                  stops: [
                    { position: 0, color: { r: 1, g: 1, b: 1, a: 1 } },
                    { position: 1, color: { type: 'VARIABLE_ALIAS', id: 'VariableID:1:2' } },
                  ],
                },
              },
              { id: 'd4', value: { type: 'VARIABLE_ALIAS', id: 'VariableID:1:3' } },
              { id: 'd5', name: 'Speed', type: 'NUMBER', value: 2, description: 'Loops/s' },
            ],
          },
        ],
      },
    ]);
    expect(globalVars.styles[nodes[0]!.fill!]).toEqual([
      {
        type: 'SHADER',
        shaderId: 'shader:mesh',
        shaderProperties: [
          { name: 'Tint', type: 'COLOR', value: '#FF000080' },
          { name: 'Spot', type: 'COLOR_POINT', value: { x: 0.5, y: 0.5, color: '#0000FF' } },
          {
            name: 'Ramp',
            type: 'GRADIENT',
            value: {
              stops: [
                { position: 0, color: '#FFFFFF' },
                { position: 1, color: { type: 'VARIABLE_ALIAS', id: 'VariableID:1:2' } },
              ],
            },
          },
          { id: 'd4', value: { type: 'VARIABLE_ALIAS', id: 'VariableID:1:3' } },
          { name: 'Speed', type: 'NUMBER', value: 2, description: 'Loops/s' },
        ],
      },
    ]);
  });
});
