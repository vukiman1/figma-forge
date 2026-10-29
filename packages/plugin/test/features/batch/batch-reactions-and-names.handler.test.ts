import { describe, expect, it, vi } from 'vitest';

import { createBatchHandler } from '../../../src/features/batch/batch.handler.js';
import { createNavigateToPageHandler } from '../../../src/features/files/navigate-to-page.handler.js';
import { createBatchRenameNodesHandler } from '../../../src/features/nodes/batch-rename-nodes.handler.js';
import { createReorderNodesHandler } from '../../../src/features/nodes/reorder-nodes.handler.js';
import { createSetFillsHandler } from '../../../src/features/paint/set-fills.handler.js';
import { createRemoveReactionsHandler } from '../../../src/features/prototype/remove-reactions.handler.js';
import { createSetReactionsHandler } from '../../../src/features/prototype/set-reactions.handler.js';
import { makeFigma, FAIL } from './batch-fake.js';
import { makeWide, failingFrame } from './batch-wide-fake.js';

describe('batch inverses for the newly batchable writes', () => {
  it('puts reactions back after set_reactions and after remove_reactions', async () => {
    const { figmaCtx, store } = makeWide();
    failingFrame(store);
    const node = (id: string, reactions: unknown[]) => {
      const n: Record<string, unknown> = {
        id,
        reactions,
        setReactionsAsync: vi.fn<(r: unknown[]) => Promise<void>>(async r => {
          n.reactions = r;
        }),
      };
      store.set(id, n);
      return n;
    };
    const had = [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'BACK' }] }];
    const a = node('1:1', []);
    const b = node('1:2', had);
    const handler = createBatchHandler(figmaCtx, {
      set_reactions: createSetReactionsHandler(figmaCtx),
      remove_reactions: createRemoveReactionsHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [
          { tool: 'set_reactions', params: { nodeId: '1:1', reactions: had } },
          { tool: 'remove_reactions', params: { nodeId: '1:2' } },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 2/);
    expect(a.reactions).toEqual([]);
    expect(b.reactions).toEqual(had);
  });

  it('navigates back to the page it started on', async () => {
    const { figmaCtx, store, pages } = makeWide();
    failingFrame(store);
    store.set('P:1', { id: 'P:1', type: 'PAGE' });
    store.set('P:2', { id: 'P:2', type: 'PAGE' });
    const handler = createBatchHandler(figmaCtx, {
      navigate_to_page: createNavigateToPageHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({ ops: [{ tool: 'navigate_to_page', params: { pageId: 'P:2' } }, FAIL] }),
    ).rejects.toThrow(/rolled back 1/);
    expect(pages.current).toBe('P:1');
  });

  it('restores names after batch_rename_nodes and the order after reorder_nodes', async () => {
    const { figmaCtx, store } = makeFigma({ F: { id: 'F', fills: [] } });
    const parent: Record<string, unknown> & { children: Record<string, unknown>[] } = {
      id: 'P',
      children: [],
      insertChild(index: number, child: Record<string, unknown>) {
        const at = parent.children.indexOf(child);
        parent.children.splice(index, 0, child);
        if (at !== -1) parent.children.splice(at < index ? at : at + 1, 1);
      },
    };
    const kids = ['a', 'b', 'c'].map(id => ({ id, name: id.toUpperCase(), parent }));
    parent.children = [...kids];
    store.set('P', parent);
    for (const k of kids) store.set(k.id, k);
    const handler = createBatchHandler(figmaCtx, {
      batch_rename_nodes: createBatchRenameNodesHandler(figmaCtx),
      reorder_nodes: createReorderNodesHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [
          { tool: 'batch_rename_nodes', params: { renames: [{ nodeId: 'a', name: 'x' }] } },
          { tool: 'reorder_nodes', params: { nodeIds: ['c'], index: 0 } },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 2/);
    expect(kids[0]!.name).toBe('A');
    expect(parent.children.map(c => c.id)).toEqual(['a', 'b', 'c']);
  });
});
