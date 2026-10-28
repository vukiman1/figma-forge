import { describe, expect, it, vi } from 'vitest';

import { createBatchHandler } from '../../../src/features/batch/batch.handler.js';
import { createReparentNodesHandler } from '../../../src/features/nodes/reparent-nodes.handler.js';
import { createRepeatNodesHandler } from '../../../src/features/nodes/repeat-nodes.handler.js';
import { createSetRepeatHandler } from '../../../src/features/nodes/set-repeat.handler.js';
import { createSetComplexStrokeHandler } from '../../../src/features/paint/set-complex-stroke.handler.js';
import { createSetFillsHandler } from '../../../src/features/paint/set-fills.handler.js';
import { createSetTextPathHandler } from '../../../src/features/text/set-text-path.handler.js';
import { makeFigma, SOLID, FAIL } from './batch-fake.js';
import { makeTree, ids } from './batch-tree-fake.js';

describe('batch inverses for Figma Draw', () => {
  it('undoes repeat_nodes like group_nodes: content back in place, the repeat group gone — ungrouping keeps every child’s id and place', async () => {
    const { node, store, figmaCtx } = makeTree();
    const page = node('P0', 'PAGE', null);
    const p = node('P', 'FRAME', page);
    node('a', 'RECTANGLE', p);
    node('b', 'RECTANGLE', p);
    node('F', 'RECTANGLE', page, { fills: [] });
    const handler = createBatchHandler(figmaCtx, {
      repeat_nodes: createRepeatNodesHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [
          {
            tool: 'repeat_nodes',
            params: { nodeIds: ['a'], modifiers: [{ repeatType: 'RADIAL', count: 8, offset: 50 }] },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(ids(p)).toEqual(['a', 'b']);
    expect([...store.keys()].filter(k => k.startsWith('R:'))).toEqual([]);
  });

  it('refuses moving the last child out of a repeat group, which Figma then deletes', async () => {
    const { node, figmaCtx } = makeTree();
    const page = node('P0', 'PAGE', null);
    const repeat = node('R', 'TRANSFORM_GROUP', page);
    node('only', 'RECTANGLE', repeat);
    node('T', 'FRAME', page);
    const handler = createBatchHandler(figmaCtx, {
      reparent_nodes: createReparentNodesHandler(figmaCtx),
    });
    await expect(
      handler({
        ops: [{ tool: 'reparent_nodes', params: { nodeIds: ['only'], newParentId: 'T' } }],
      }),
    ).rejects.toThrow(/would empty TRANSFORM_GROUP R/);
    expect(ids(repeat)).toEqual(['only']);
  });

  it('puts back a repeat group’s modifiers and a text path’s start', async () => {
    const modifiers = [
      {
        type: 'REPEAT',
        repeatType: 'LINEAR',
        axis: 'HORIZONTAL',
        unitType: 'PIXELS',
        offset: 4,
        count: 3,
      },
    ];
    const { figmaCtx, store } = makeFigma({
      R: { id: 'R', type: 'TRANSFORM_GROUP', transformModifiers: modifiers },
      T: {
        id: 'T',
        type: 'TEXT_PATH',
        textPathStartData: { segment: 1, position: 0.25 },
        vectorNetwork: { segments: [{}, {}, {}, {}] },
      },
      F: { id: 'F', fills: [] },
    });
    const handler = createBatchHandler(figmaCtx, {
      set_repeat: createSetRepeatHandler(figmaCtx),
      set_text_path: createSetTextPathHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });
    await expect(
      handler({
        ops: [
          { tool: 'set_repeat', params: { nodeId: 'R', modifiers: [] } },
          { tool: 'set_text_path', params: { nodeId: 'T', startSegment: 3, startPosition: 0 } },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 2/);
    expect(store.get('R')!.transformModifiers).toEqual(modifiers);
    expect(store.get('T')!.textPathStartData).toEqual({ segment: 1, position: 0.25 });
  });

  const stroked = (complex: unknown, widths: unknown) => {
    const { figmaCtx, store } = makeFigma({
      V: {
        id: 'V',
        type: 'VECTOR',
        strokes: [{ type: 'SOLID', visible: true, color: { r: 0, g: 0, b: 0 } }],
        complexStrokeProperties: complex,
        variableWidthStrokeProperties: widths,
      },
      F: { id: 'F', fills: [] },
    });
    const loadBrushesAsync = vi.fn<(kind: string) => Promise<void>>(async () => {});
    (figmaCtx as unknown as { loadBrushesAsync: unknown }).loadBrushesAsync = loadBrushesAsync;
    const handler = createBatchHandler(figmaCtx, {
      set_complex_stroke: createSetComplexStrokeHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });
    return { store, handler, loadBrushesAsync };
  };

  it('puts a brush and a preset width profile back — the brush loaded at capture, the preset by name', async () => {
    const brush = { type: 'BRUSH', brushType: 'STRETCH', brushName: 'NOIR', direction: 'FORWARD' };
    const taper = {
      widthProfile: 'TAPER',
      variableWidthPoints: [
        { position: 0, width: 0.5 },
        { position: 1, width: 0.1875 },
      ],
    };
    const t = stroked(brush, taper);
    await expect(
      t.handler({
        ops: [
          {
            tool: 'set_complex_stroke',
            params: {
              nodeId: 'V',
              complexStrokeProperties: { type: 'DYNAMIC', frequency: 3 },
              variableWidthStrokeProperties: { widthProfile: 'EYE' },
            },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);
    expect(t.loadBrushesAsync).toHaveBeenCalledWith('STRETCH');
    expect(t.store.get('V')!.complexStrokeProperties).toEqual(brush);
    expect(t.store.get('V')!.variableWidthStrokeProperties).toEqual({ widthProfile: 'TAPER' });
  });

  it('refuses a node with a custom brush, which the plugin API cannot set back', async () => {
    const t = stroked(
      { type: 'BRUSH', brushType: 'SCATTER', brushName: 'CUSTOM' },
      { widthProfile: 'UNIFORM', variableWidthPoints: [] },
    );
    await expect(
      t.handler({
        ops: [
          {
            tool: 'set_complex_stroke',
            params: { nodeId: 'V', complexStrokeProperties: { type: 'BASIC' } },
          },
        ],
      }),
    ).rejects.toThrow(/has a custom brush, which the plugin API cannot set back/);
    expect(t.store.get('V')!.complexStrokeProperties).toEqual({
      type: 'BRUSH',
      brushType: 'SCATTER',
      brushName: 'CUSTOM',
    });
  });

  it('puts a pattern fill back through the async setter, the only one Figma lets take it', async () => {
    const pattern = {
      type: 'PATTERN',
      sourceNodeId: 'S',
      tileType: 'RECTANGULAR',
      scalingFactor: 1,
    };
    let fills: unknown[] = [pattern, SOLID(1)];
    const node: Record<string, unknown> = { id: 'N', type: 'RECTANGLE' };
    Object.defineProperty(node, 'fills', {
      get: () => fills,
      set: (v: unknown[]) => {
        if (v.some(p => (p as { type?: unknown }).type === 'PATTERN')) {
          throw new Error('in set_fills: Expected [0].type to be one of SOLID, …');
        }
        fills = v;
      },
      enumerable: true,
    });
    node.setFillsAsync = vi.fn<(v: unknown[]) => Promise<void>>(async v => {
      fills = v;
    });
    const { figmaCtx } = makeFigma({ N: node, F: { id: 'F', fills: [] } });
    const handler = createBatchHandler(figmaCtx, { set_fills: createSetFillsHandler(figmaCtx) });
    await expect(
      handler({ ops: [{ tool: 'set_fills', params: { nodeId: 'N', fills: [SOLID(0)] } }, FAIL] }),
    ).rejects.toThrow(/rolled back 1/);
    expect(fills).toEqual([pattern, SOLID(1)]);
  });

  it('refuses create_text_path, whose source cannot come back under its id', async () => {
    const { figmaCtx } = makeFigma({});
    await expect(
      createBatchHandler(
        figmaCtx,
        {},
      )({
        ops: [{ tool: 'create_text_path', params: { nodeId: 'E', characters: 'x' } }],
      }),
    ).rejects.toThrow(
      /'create_text_path' \(index 0\) is not batchable — the source shape is consumed/,
    );
  });
});
