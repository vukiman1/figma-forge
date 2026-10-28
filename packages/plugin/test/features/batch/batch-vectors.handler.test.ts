import { describe, expect, it } from 'vitest';

import { createBatchHandler } from '../../../src/features/batch/batch.handler.js';
import { createSetFillsHandler } from '../../../src/features/paint/set-fills.handler.js';
import { createSetStrokesHandler } from '../../../src/features/paint/set-strokes.handler.js';
import { createCreateVectorHandler } from '../../../src/features/vector/create-vector.handler.js';
import { createOutlineStrokeHandler } from '../../../src/features/vector/outline-stroke.handler.js';
import { createSetVectorHandler } from '../../../src/features/vector/set-vector.handler.js';
import { MIXED, FAIL } from './batch-fake.js';
import { makeTree, ids } from './batch-tree-fake.js';

describe('batch inverses for vectors', () => {
  const at = (x: number, y: number) => [
    [1, 0, x],
    [0, 1, y],
  ];

  it('puts a redrawn vector back whole: its network, the width profile a branch dropped, its place', async () => {
    const { node, figmaCtx } = makeTree();
    const page = node('P0', 'PAGE', null);
    const frame = node('P', 'FRAME', page);
    const network = {
      vertices: [
        { x: 0, y: 0, strokeCap: 'ROUND' },
        { x: 80, y: 0, cornerRadius: 12 },
      ],
      segments: [{ start: 0, end: 1, tangentStart: { x: 20, y: -20 } }],
      regions: [],
    };
    const taper = {
      widthProfile: 'TAPER',
      variableWidthPoints: [
        { position: 0, width: 0.5 },
        { position: 1, width: 0.1875 },
      ],
    };
    const v = node('V', 'VECTOR', frame, {
      relativeTransform: at(60, 500),
      vectorNetwork: network,
      variableWidthStrokeProperties: taper,
    });
    v.setVectorNetworkAsync = async (next: { segments: unknown[]; vertices: { x: number }[] }) => {
      v.vectorNetwork = next;
      const [row0, row1] = v.relativeTransform as [number[], number[]];
      v.relativeTransform = at(row0[2]! + Math.min(...next.vertices.map(p => p.x)), row1[2]!);
      if (next.segments.length > next.vertices.length - 1) {
        v.variableWidthStrokeProperties = { widthProfile: 'UNIFORM', variableWidthPoints: [] };
      }
    };
    node('F', 'RECTANGLE', page, { fills: [] });
    const handler = createBatchHandler(figmaCtx, {
      set_vector: createSetVectorHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });
    await expect(
      handler({
        ops: [
          {
            tool: 'set_vector',
            params: {
              nodeId: 'V',
              vectorNetwork: {
                vertices: [
                  { x: -20, y: 0 },
                  { x: 50, y: 50 },
                  { x: 100, y: 0 },
                ],
                segments: [
                  { start: 0, end: 1 },
                  { start: 1, end: 2 },
                  { start: 2, end: 0 },
                ],
              },
            },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);
    expect(v.vectorNetwork).toEqual(network);
    expect(v.variableWidthStrokeProperties).toEqual({ widthProfile: 'TAPER' });
    expect(v.relativeTransform).toEqual(at(60, 500));
  });

  it('puts back per-vertex caps that one set_strokes cap overwrote, through the network', async () => {
    const { node, figmaCtx } = makeTree();
    const page = node('P0', 'PAGE', null);
    const network = {
      vertices: [
        { x: 0, y: 0, strokeCap: 'ROUND' },
        { x: 10, y: 0, strokeCap: 'ARROW_LINES' },
      ],
      segments: [{ start: 0, end: 1 }],
      regions: [],
    };
    const v = node('V', 'VECTOR', page, {
      strokes: [],
      strokeJoin: 'MITER',
      vectorNetwork: network,
    });
    v.setVectorNetworkAsync = async (next: typeof network) => {
      v.vectorNetwork = next;
    };
    Object.defineProperty(v, 'strokeCap', {
      get: () => {
        const caps = new Set((v.vectorNetwork as typeof network).vertices.map(p => p.strokeCap));
        return caps.size === 1 ? [...caps][0] : MIXED;
      },
      set: (cap: string) => {
        const n = v.vectorNetwork as typeof network;
        v.vectorNetwork = {
          ...n,
          vertices: n.vertices.map(p => Object.assign({}, p, { strokeCap: cap })),
        };
      },
      configurable: true,
    });
    node('F', 'RECTANGLE', page, { fills: [] });
    const handler = createBatchHandler(figmaCtx, {
      set_strokes: createSetStrokesHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });
    await expect(
      handler({
        ops: [
          { tool: 'set_strokes', params: { nodeId: 'V', strokes: [], strokeCap: 'ROUND' } },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);
    expect(v.vectorNetwork).toEqual(network);
  });

  it('removes what outline_stroke and create_vector added', async () => {
    const { node, store, figmaCtx } = makeTree();
    const page = node('P0', 'PAGE', null, { absoluteTransform: at(0, 0) });
    const frame = node('P', 'FRAME', page, { absoluteTransform: at(0, 0) });
    const source = node('S', 'VECTOR', frame, {
      strokes: [{ type: 'SOLID', visible: true }],
      strokeWeight: 2,
      absoluteTransform: at(0, 0),
    });
    source.outlineStroke = () => {
      const outline = node('O', 'VECTOR', page, { absoluteTransform: at(0, 0) });
      return outline;
    };
    (figmaCtx as unknown as { createVector: unknown }).createVector = () => {
      const v = node('NV', 'VECTOR', null, { x: 0, y: 0 });
      v.vectorPaths = [];
      return v;
    };
    (figmaCtx as unknown as { currentPage: unknown }).currentPage = page;
    node('F', 'RECTANGLE', page, { fills: [] });
    const handler = createBatchHandler(figmaCtx, {
      outline_stroke: createOutlineStrokeHandler(figmaCtx),
      create_vector: createCreateVectorHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });
    await expect(
      handler({
        ops: [
          { tool: 'outline_stroke', params: { nodeId: 'S' } },
          {
            tool: 'create_vector',
            params: { parentId: 'P', vectorPaths: [{ windingRule: 'NONE', data: 'M 0 0 L 4 4' }] },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 2/);
    expect(ids(frame)).toEqual(['S']);
    expect(store.has('O')).toBe(false);
    expect(store.has('NV')).toBe(false);
  });
});
