import { describe, expect, it } from 'vitest';

import { dedupeStyles, type DesignContextNode } from '../../src/index.js';
import { solid } from './fixtures.js';

describe('dedupeStyles — colour fills', () => {
  it('carries a gradient’s cssAngle into globalVars, and keeps differently-angled gradients apart', () => {
    const paint = (cssAngle: number) => ({
      type: 'GRADIENT_LINEAR',
      visible: true,
      opacity: 1,
      cssAngle,
      gradientStops: [
        { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
        { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
      ],
      gradientTransform: [
        [0.5, 0.5, 0],
        [0, 1, 0],
      ],
    });
    const { globalVars } = dedupeStyles([
      { id: '1:1', name: 'Wide', type: 'FRAME', fills: [paint(165.96)] },
      { id: '1:2', name: 'Square', type: 'FRAME', fills: [paint(135)] },
      { id: '1:3', name: 'Wide again', type: 'FRAME', fills: [paint(165.96)] },
    ] as never);

    const entries = Object.values(globalVars.styles) as { cssAngle?: number }[][];
    const angles = entries.map(e => e[0]?.cssAngle ?? 0).toSorted((a, b) => a - b);
    expect(entries).toHaveLength(2);
    expect(angles).toEqual([135, 165.96]);
  });

  it('converts SOLID fills to hex and replaces them with a globalVars ref', () => {
    const n: DesignContextNode = {
      id: 'a',
      name: 'a',
      type: 'RECTANGLE',
      fills: [solid(0.3843137, 0.4, 0.9411764)],
    };
    const { nodes, globalVars } = dedupeStyles([n]);

    expect(nodes[0]?.fills).toBeUndefined();
    const ref = nodes[0]?.fill;
    expect(ref).toMatch(/^fill_/);
    expect(globalVars.styles[ref!]).toEqual([{ type: 'SOLID', color: '#6266F0' }]);
  });

  it('folds opacity < 1 into an 8-digit hex alpha', () => {
    const { nodes, globalVars } = dedupeStyles([
      { id: 'a', name: 'a', type: 'RECTANGLE', fills: [solid(1, 1, 1, 0.5)] },
    ]);
    expect(globalVars.styles[nodes[0]!.fill!]).toEqual([{ type: 'SOLID', color: '#FFFFFF80' }]);
  });

  it('carries a gradient fill with its stops AND the axis transform (direction not lost)', () => {
    const n: DesignContextNode = {
      id: 'a',
      name: 'a',
      type: 'RECTANGLE',
      fills: [
        {
          type: 'GRADIENT_LINEAR',
          visible: true,
          opacity: 1,
          gradientStops: [
            { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
            { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
          ],
          gradientTransform: [
            [0, 1, 0],
            [-1, 0, 1],
          ],
        },
      ],
    };
    const { nodes, globalVars } = dedupeStyles([n]);
    expect(globalVars.styles[nodes[0]!.fill!]).toEqual([
      {
        type: 'GRADIENT_LINEAR',
        gradientStops: [
          { position: 0, color: '#FF0000' },
          { position: 1, color: '#0000FF' },
        ],
        gradientTransform: [
          [0, 1, 0],
          [-1, 0, 1],
        ],
      },
    ]);
  });

  it('carries scaleMode (object-fit) on an IMAGE fill', () => {
    const { nodes, globalVars } = dedupeStyles([
      {
        id: 'a',
        name: 'a',
        type: 'RECTANGLE',
        fills: [{ type: 'IMAGE', visible: true, opacity: 1, scaleMode: 'FILL' }],
      },
    ]);
    expect(globalVars.styles[nodes[0]!.fill!]).toEqual([{ type: 'IMAGE', scaleMode: 'FILL' }]);
  });

  it("folds a gradient paint's opacity into each stop, as SOLID folds it into its hex", () => {
    const { nodes, globalVars } = dedupeStyles([
      {
        id: 'a',
        name: 'a',
        type: 'RECTANGLE',
        fills: [
          {
            type: 'GRADIENT_LINEAR',
            visible: true,
            opacity: 0.5,
            gradientStops: [
              { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
              { position: 1, color: { r: 0, g: 0, b: 1, a: 0.8 } },
            ],
            gradientTransform: [
              [1, 0, 0],
              [0, 1, 0],
            ],
          },
        ],
      },
    ] as never);
    const [paint] = globalVars.styles[nodes[0]!.fill!] as {
      gradientStops: unknown;
      opacity?: number;
    }[];
    expect(paint!.gradientStops).toEqual([
      { position: 0, color: '#FF000080' },
      { position: 1, color: '#0000FF66' },
    ]);
    expect(paint).not.toHaveProperty('opacity');
  });

  it("carries the paint's own opacity on paints with no colour to fold it into", () => {
    const image = (opacity: number) => ({
      type: 'IMAGE',
      visible: true,
      opacity,
      scaleMode: 'FILL',
    });
    const { nodes, globalVars } = dedupeStyles([
      { id: 'a', name: 'a', type: 'RECTANGLE', fills: [image(0.5)] },
      { id: 'b', name: 'b', type: 'RECTANGLE', fills: [image(1)] },
      {
        id: 'c',
        name: 'c',
        type: 'RECTANGLE',
        fills: [{ type: 'SOLID', visible: true, opacity: 0.5, color: { r: 1, g: 0, b: 0 } }],
      },
    ] as never);
    expect(globalVars.styles[nodes[0]!.fill!]).toEqual([
      { type: 'IMAGE', scaleMode: 'FILL', opacity: 0.5 },
    ]);
    expect(globalVars.styles[nodes[1]!.fill!]).toEqual([{ type: 'IMAGE', scaleMode: 'FILL' }]);
    expect(globalVars.styles[nodes[2]!.fill!]).toEqual([{ type: 'SOLID', color: '#FF000080' }]);
  });
});
