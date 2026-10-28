import type { BatchResult } from '@figma-forge/core';
import { describe, expect, it, vi } from 'vitest';

import { createBatchHandler } from '../../../src/features/batch/batch.handler.js';
import { createSetTextHandler } from '../../../src/features/text/set-text.handler.js';
import { createIdempotencyCache, idempotent } from '../../../src/idempotency.js';
import { makeFigma, realWrites, FAIL } from './batch-fake.js';
import { type Run, fakeText } from './batch-text-fake.js';

describe('batch handler', () => {
  it('applies ops in order and returns one result per op', async () => {
    const { figmaCtx, store } = makeFigma({
      '1:1': { id: '1:1', name: 'A', opacity: 1 },
      '1:2': { id: '1:2', name: 'B', x: 10, y: 20 },
    });
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    const result = (await handler({
      ops: [
        { tool: 'rename_node', params: { nodeId: '1:1', name: 'renamed' } },
        { tool: 'set_opacity', params: { nodeId: '1:1', opacity: 0.5 } },
        { tool: 'move_nodes', params: { nodeIds: ['1:2'], dx: 5, dy: -5 } },
      ],
    })) as BatchResult;

    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(3);
    expect(store.get('1:1')).toMatchObject({ name: 'renamed', opacity: 0.5 });
    expect(store.get('1:2')).toMatchObject({ x: 15, y: 15 });
  });

  it('rejects a non-invertible op at validate time without mutating anything', async () => {
    const { figmaCtx, store } = makeFigma({ '1:1': { id: '1:1', name: 'A' } });
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          { tool: 'rename_node', params: { nodeId: '1:1', name: 'renamed' } },
          { tool: 'delete_nodes', params: { nodeIds: ['1:1'] } },
        ],
      }),
    ).rejects.toThrow(/not batchable/);
    expect(store.get('1:1')).toMatchObject({ name: 'A' });
  });

  it('rejects create_component with fromNodeId (no faithful inverse) at validate time', async () => {
    const { figmaCtx, store } = makeFigma({ '1:1': { id: '1:1', type: 'FRAME', name: 'A' } });
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          { tool: 'rename_node', params: { nodeId: '1:1', name: 'renamed' } },
          { tool: 'create_component', params: { fromNodeId: '1:1' } },
        ],
      }),
    ).rejects.toThrow(/fromNodeId is not batchable/);
    expect(store.get('1:1')).toMatchObject({ name: 'A' });
  });

  it('aborts in the capture phase (bad node id) before any op is applied', async () => {
    const { figmaCtx, store } = makeFigma({ '1:1': { id: '1:1', name: 'A' } });
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          { tool: 'rename_node', params: { nodeId: '1:1', name: 'renamed' } },
          { tool: 'rename_node', params: { nodeId: 'missing', name: 'x' } },
        ],
      }),
    ).rejects.toThrow(/node missing not found/);
    expect(store.get('1:1')).toMatchObject({ name: 'A' });
  });

  it('rolls back already-applied mutations when a later op fails mid-apply', async () => {
    const { figmaCtx, store } = makeFigma({
      '1:1': { id: '1:1', name: 'A', opacity: 1 },
      '1:2': { id: '1:2', name: 'B', fills: [] },
    });
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          { tool: 'rename_node', params: { nodeId: '1:1', name: 'renamed' } },
          { tool: 'set_opacity', params: { nodeId: '1:1', opacity: 0.3 } },
          { tool: 'set_fills', params: { nodeId: '1:2', fills: [{ type: 'GRADIENT_LINEAR' }] } },
        ],
      }),
    ).rejects.toThrow(/op 2 \(set_fills\) failed, rolled back 2/);

    expect(store.get('1:1')).toMatchObject({ name: 'A', opacity: 1 });
  });

  it('rolls back a create by removing the node it produced', async () => {
    const { figmaCtx, store } = makeFigma({ '1:2': { id: '1:2', fills: [] } });
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          { tool: 'create_frame', params: { name: 'New' } },
          { tool: 'set_fills', params: { nodeId: '1:2', fills: [{ type: 'GRADIENT_LINEAR' }] } },
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);

    const created = [...store.keys()].filter(k => k.startsWith('9:'));
    expect(created).toHaveLength(0);
  });

  it('refuses a non-batchable op with the reason, before anything runs', async () => {
    const { figmaCtx, store } = makeFigma({ '1:1': { id: '1:1', name: 'A' } });
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          { tool: 'rename_node', params: { nodeId: '1:1', name: 'renamed' } },
          { tool: 'delete_nodes', params: { nodeIds: ['1:1'] } },
        ],
      }),
    ).rejects.toThrow(/'delete_nodes' \(index 1\) is not batchable — a deleted node cannot/);
    expect(store.get('1:1')).toMatchObject({ name: 'A' });
  });

  it('refuses two ops that between them would empty a group Figma then deletes', async () => {
    const group: Record<string, unknown> = { id: 'G', type: 'GROUP', name: 'G' };
    const a = { id: 'a', type: 'RECTANGLE', name: 'a', parent: group };
    const b = { id: 'b', type: 'RECTANGLE', name: 'b', parent: group };
    group.children = [a, b];
    const target = {
      id: 'T',
      type: 'FRAME',
      parent: null,
      children: [],
      appendChild: vi.fn<(child: unknown) => void>(),
    };
    const { figmaCtx, store } = makeFigma({ G: group, a, b, T: target });
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          { tool: 'reparent_nodes', params: { nodeIds: ['a'], newParentId: 'T' } },
          { tool: 'reparent_nodes', params: { nodeIds: ['b'], newParentId: 'T' } },
        ],
      }),
    ).rejects.toThrow(/op 0 \(reparent_nodes\), op 1 \(reparent_nodes\) would empty GROUP G/);
    expect(target.appendChild).not.toHaveBeenCalled();
    expect(store.get('a')).toMatchObject({ parent: group });
  });

  it('refuses taking a variant out of its set at capture', async () => {
    const set: Record<string, unknown> = { id: 'S', type: 'COMPONENT_SET' };
    const variant = { id: 'v', type: 'COMPONENT', name: 'State=A', parent: set };
    const other = { id: 'w', type: 'COMPONENT', name: 'State=B', parent: set };
    set.children = [variant, other];
    const target = {
      id: 'T',
      type: 'FRAME',
      parent: null,
      children: [],
      appendChild: vi.fn<(child: unknown) => void>(),
    };
    const { figmaCtx } = makeFigma({ S: set, v: variant, w: other, T: target });
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({ ops: [{ tool: 'reparent_nodes', params: { nodeIds: ['v'], newParentId: 'T' } }] }),
    ).rejects.toThrow(/v is a variant of S/);
    expect(target.appendChild).not.toHaveBeenCalled();
  });

  it('names what a rollback could not put back instead of claiming a clean one', async () => {
    const text = fakeText('1:1', 'Hello World');
    for (let i = 6; i < 11; i += 1) {
      (text.patchRun as (i: number, p: Run) => void)(i, { openTypeFeatures: { SUPS: true } });
    }
    const { figmaCtx, store } = makeFigma({ F: { id: 'F', fills: [] } });
    store.set('1:1', text);
    const handler = createBatchHandler(figmaCtx, {
      ...realWrites(figmaCtx),
      set_text: createSetTextHandler(figmaCtx),
    });

    await expect(
      handler({
        ops: [{ tool: 'set_text', params: { nodeId: '1:1', characters: 'Changed' } }, FAIL],
      }),
    ).rejects.toThrow(
      /rolled back 1 applied op\(s\) \(restored with residue: op 0 \(set_text\): text 1:1 keeps changed OpenType features/,
    );
    expect(text.characters).toBe('Hello World');
  });

  it('replays as a unit under idempotency: same requestId applies its ops once', async () => {
    const { figmaCtx, store } = makeFigma({ '1:2': { id: '1:2', x: 0, y: 0 } });
    const batch = idempotent(
      createIdempotencyCache(),
      createBatchHandler(figmaCtx, realWrites(figmaCtx)),
    );
    const call = {
      requestId: 'r1',
      ops: [{ tool: 'move_nodes', params: { nodeIds: ['1:2'], dx: 10, dy: 0 } }],
    };

    const first = (await batch(call)) as BatchResult;
    const replay = (await batch(call)) as BatchResult;

    expect(replay).toEqual(first);
    expect(store.get('1:2')).toMatchObject({ x: 10, y: 0 });
  });

  it('turns a bare-string rejection during capture into an Error saying nothing was applied', async () => {
    const { figmaCtx, store } = makeFigma({ '1:1': { id: '1:1', name: 'A' } });
    const handler = createBatchHandler(
      {
        ...figmaCtx,
        getNodeByIdAsync: async (id: string) => {
          if (id === 'offline') throw 'Unable to establish connection to Figma after 10 seconds';
          return store.get(id) ?? null;
        },
      } as unknown as typeof figma,
      realWrites(figmaCtx),
    );

    const failure = handler({
      ops: [
        { tool: 'rename_node', params: { nodeId: '1:1', name: 'renamed' } },
        { tool: 'rename_node', params: { nodeId: 'offline', name: 'x' } },
      ],
    });
    await expect(failure).rejects.toBeInstanceOf(Error);
    await expect(failure).rejects.toThrow(
      /capture failed before any op was applied: Unable to establish connection/,
    );
    expect(store.get('1:1')).toMatchObject({ name: 'A' });
  });

  it('validates the ops envelope', async () => {
    const { figmaCtx } = makeFigma({});
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));
    await expect(handler({})).rejects.toThrow(/ops: .*expected array/);
    await expect(handler({ ops: [] })).rejects.toThrow(/ops: .*>=1 items/);
    await expect(handler({ ops: [{ params: {} }] })).rejects.toThrow(
      /ops\.0\.tool: .*expected string/,
    );
  });
});
