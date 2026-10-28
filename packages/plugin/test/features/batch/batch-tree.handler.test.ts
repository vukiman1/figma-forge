import { describe, expect, it } from 'vitest';

import { createBatchHandler } from '../../../src/features/batch/batch.handler.js';
import { createCombineAsVariantsHandler } from '../../../src/features/components/combine-as-variants.handler.js';
import { createSetAutoLayoutHandler } from '../../../src/features/layout/set-auto-layout.handler.js';
import { createGroupNodesHandler } from '../../../src/features/nodes/group-nodes.handler.js';
import { createReparentNodesHandler } from '../../../src/features/nodes/reparent-nodes.handler.js';
import { createSetFillsHandler } from '../../../src/features/paint/set-fills.handler.js';
import { FAIL } from './batch-fake.js';
import { type TreeNode, makeTree, ids } from './batch-tree-fake.js';

describe('batch inverses for tree structure', () => {
  it('puts a node taken into auto-layout back where it was, position included', async () => {
    const { node, figmaCtx } = makeTree();
    const page = node('P0', 'PAGE', null);
    const plain = node('P1', 'FRAME', page);
    node('x', 'RECTANGLE', plain);
    const moved = node('n', 'RECTANGLE', plain, {});
    moved.relativeTransform = [
      [1, 0, 5],
      [0, 1, 6],
    ];
    node('y', 'RECTANGLE', plain);
    const flow = node('P2', 'FRAME', page, { layoutMode: 'HORIZONTAL' });
    node('z', 'RECTANGLE', flow);
    node('F', 'RECTANGLE', page, { fills: [] });
    const handler = createBatchHandler(figmaCtx, {
      reparent_nodes: createReparentNodesHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [{ tool: 'reparent_nodes', params: { nodeIds: ['n'], newParentId: 'P2' } }, FAIL],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(ids(plain)).toEqual(['x', 'n', 'y']);
    expect(ids(flow)).toEqual(['z']);
    expect(moved.relativeTransform).toEqual([
      [1, 0, 5],
      [0, 1, 6],
    ]);
  });

  it('ungroups nodes gathered from two parents back into both, and the group goes', async () => {
    const { node, store, figmaCtx } = makeTree();
    const page = node('P0', 'PAGE', null);
    const p = node('P', 'FRAME', page);
    node('a', 'RECTANGLE', p);
    node('b', 'RECTANGLE', p);
    const q = node('Q', 'FRAME', page);
    node('c', 'RECTANGLE', q);
    node('F', 'RECTANGLE', page, { fills: [] });
    const handler = createBatchHandler(figmaCtx, {
      group_nodes: createGroupNodesHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({ ops: [{ tool: 'group_nodes', params: { nodeIds: ['a', 'c'] } }, FAIL] }),
    ).rejects.toThrow(/rolled back 1/);

    expect(ids(p)).toEqual(['a', 'b']);
    expect(ids(q)).toEqual(['c']);
    expect([...store.keys()].filter(k => k.startsWith('G:'))).toEqual([]);
  });

  it('un-combines components: order, names, and the properties the set handed out', async () => {
    const { node, store, figmaCtx } = makeTree();
    const page = node('P0', 'PAGE', null);
    const component = (id: string, defs: Record<string, unknown>) =>
      node(id, 'COMPONENT', page, {
        componentPropertyDefinitions: defs,
        deleteComponentProperty(this: TreeNode, key: string) {
          const { [key]: _gone, ...rest } = this.componentPropertyDefinitions as Record<
            string,
            unknown
          >;
          this.componentPropertyDefinitions = rest;
        },
      });
    const k1 = component('k1', { 'Txt#1:0': { type: 'TEXT', defaultValue: 'hi' } });
    k1.name = 'Alpha';
    const k2 = component('k2', {});
    k2.name = 'Beta';
    node('F', 'RECTANGLE', page, { fills: [] });
    const handler = createBatchHandler(figmaCtx, {
      combine_as_variants: createCombineAsVariantsHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({ ops: [{ tool: 'combine_as_variants', params: { nodeIds: ['k1', 'k2'] } }, FAIL] }),
    ).rejects.toThrow(/rolled back 1/);

    expect(ids(page)).toEqual(['k1', 'k2', 'F']);
    expect([k1.name, k2.name]).toEqual(['Alpha', 'Beta']);
    expect(k1.componentPropertyDefinitions).toEqual({
      'Txt#1:0': { type: 'TEXT', defaultValue: 'hi' },
    });
    expect(k2.componentPropertyDefinitions).toEqual({});
    expect([...store.keys()].filter(k => k.startsWith('S:'))).toEqual([]);
  });

  it('turns auto-layout back off last, after the fields only a layout mode can take', async () => {
    const { node, figmaCtx } = makeTree();
    const page = node('P0', 'PAGE', null);
    const writes: string[] = [];
    const state: Record<string, unknown> = { layoutMode: 'NONE', paddingLeft: 0, itemSpacing: 0 };
    const frame = node('A', 'FRAME', page);
    for (const k of Object.keys(state)) {
      Object.defineProperty(frame, k, {
        enumerable: true,
        get: () => state[k],
        set: (v: unknown) => {
          writes.push(`${k}=${String(v)}`);
          state[k] = v;
        },
      });
    }
    node('F', 'RECTANGLE', page, { fills: [] });
    const handler = createBatchHandler(figmaCtx, {
      set_auto_layout: createSetAutoLayoutHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [
          {
            tool: 'set_auto_layout',
            params: { nodeId: 'A', layoutMode: 'HORIZONTAL', paddingLeft: 16, itemSpacing: 8 },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(state).toEqual({ layoutMode: 'NONE', paddingLeft: 0, itemSpacing: 0 });
    const undo = writes.slice(writes.indexOf('itemSpacing=8') + 1);
    expect(undo.at(-1)).toBe('layoutMode=NONE');
    expect(undo).toContain('paddingLeft=0');
  });
});
