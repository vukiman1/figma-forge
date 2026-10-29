import type { BatchResult } from '@figma-forge/core';
import { describe, expect, it, vi } from 'vitest';

import { createBatchHandler } from '../../../src/features/batch/batch.handler.js';
import { createSetFillsHandler } from '../../../src/features/paint/set-fills.handler.js';
import { makeFigma, realWrites, SOLID, FAIL } from './batch-fake.js';

describe('batch handler', () => {
  it('restores the previous x/y on rollback of a set_position op', async () => {
    const { figmaCtx, store } = makeFigma({
      '1:1': { id: '1:1', x: 10, y: 20 },
      '1:2': { id: '1:2', fills: [] },
    });
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          { tool: 'set_position', params: { nodeId: '1:1', x: 400 } },
          { tool: 'set_fills', params: { nodeId: '1:2', fills: [{ type: 'GRADIENT_LINEAR' }] } },
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(store.get('1:1')).toMatchObject({ x: 10, y: 20 });
  });

  it('rolls back when the set_position op is itself the one that fails', async () => {
    const { figmaCtx, store } = makeFigma({
      '1:1': { id: '1:1', name: 'A' },
      '1:2': {
        id: '1:2',
        x: 0,
        y: 0,
        layoutPositioning: 'AUTO',
        parent: { layoutMode: 'VERTICAL' },
      },
    });
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          { tool: 'rename_node', params: { nodeId: '1:1', name: 'renamed' } },
          { tool: 'set_position', params: { nodeId: '1:2', x: 400 } },
        ],
      }),
    ).rejects.toThrow(/op 1 \(set_position\) failed, rolled back 1/);

    expect(store.get('1:1')).toMatchObject({ name: 'A' });
    expect(store.get('1:2')).toMatchObject({ x: 0, y: 0 });
  });

  it('applies a set_position op alongside other writes', async () => {
    const { figmaCtx, store } = makeFigma({ '1:1': { id: '1:1', name: 'A', x: 0, y: 0 } });
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    const result = (await handler({
      ops: [
        { tool: 'set_position', params: { nodeId: '1:1', x: 120, y: 40 } },
        { tool: 'rename_node', params: { nodeId: '1:1', name: 'placed' } },
      ],
    })) as BatchResult;

    expect(result.results).toHaveLength(2);
    expect(store.get('1:1')).toMatchObject({ x: 120, y: 40, name: 'placed' });
  });

  it('restores a fill on rollback', async () => {
    const { figmaCtx, store } = makeFigma({
      '1:1': { id: '1:1', fills: [SOLID(0.2)] },
      '1:2': { id: '1:2', fills: [] },
    });
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          { tool: 'set_fills', params: { nodeId: '1:1', fills: [SOLID(0.9)] } },
          { tool: 'set_fills', params: { nodeId: '1:2', fills: [{ type: 'GRADIENT_LINEAR' }] } },
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(store.get('1:1')!.fills).toEqual([SOLID(0.2)]);
  });

  it('reports undo failures instead of claiming a clean rollback', async () => {
    const store = new Map<string, Record<string, unknown>>([['1:2', { id: '1:2', fills: [] }]]);
    const figmaCtx = {
      root: { children: [] },
      currentPage: { appendChild: vi.fn<(n: unknown) => void>() },
      getNodeByIdAsync: async (id: string) => store.get(id) ?? null,
      createFrame: () => {
        const node = {
          id: '9:1',
          name: 'F',
          type: 'FRAME',
          resize: vi.fn<(w: number, h: number) => void>(),
          remove: () => {
            throw new Error('cannot remove');
          },
        };
        store.set('9:1', node);
        return node;
      },
    } as unknown as typeof figma;
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          { tool: 'create_frame', params: {} },
          { tool: 'set_fills', params: { nodeId: '1:2', fills: [{ type: 'GRADIENT_LINEAR' }] } },
        ],
      }),
    ).rejects.toThrow(/undo\(s\) FAILED.*cannot remove.*partially changed/);
  });

  it('restores per-corner radii on rollback when cornerRadius reads mixed', async () => {
    const { figmaCtx, store } = makeFigma({
      '1:1': {
        id: '1:1',
        cornerRadius: Symbol('mixed'),
        topLeftRadius: 8,
        topRightRadius: 0,
        bottomRightRadius: 4,
        bottomLeftRadius: 0,
      },
      '1:2': { id: '1:2', fills: [] },
    });
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          { tool: 'set_corner_radius', params: { nodeId: '1:1', radius: 12 } },
          { tool: 'set_fills', params: { nodeId: '1:2', fills: [{ type: 'GRADIENT_LINEAR' }] } },
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(store.get('1:1')).toMatchObject({
      topLeftRadius: 8,
      topRightRadius: 0,
      bottomRightRadius: 4,
      bottomLeftRadius: 0,
    });
  });

  it('restores strokeAlign / dashPattern / per-side weights on rollback', async () => {
    const { figmaCtx, store } = makeFigma({
      '1:1': {
        id: '1:1',
        strokes: [SOLID(0.2)],
        strokeWeight: Symbol('mixed'),
        strokeAlign: 'INSIDE',
        dashPattern: [4, 2],
        strokeTopWeight: 1,
        strokeRightWeight: 0,
        strokeBottomWeight: 2,
        strokeLeftWeight: 0,
      },
      '1:2': { id: '1:2', fills: [] },
    });
    const handler = createBatchHandler(figmaCtx, realWrites(figmaCtx));

    await expect(
      handler({
        ops: [
          {
            tool: 'set_strokes',
            params: {
              nodeId: '1:1',
              strokes: [SOLID(0.9)],
              strokeWeight: 3,
              strokeAlign: 'CENTER',
              dashPattern: [],
            },
          },
          { tool: 'set_fills', params: { nodeId: '1:2', fills: [{ type: 'GRADIENT_LINEAR' }] } },
        ],
      }),
    ).rejects.toThrow(/rolled back 1/);

    expect(store.get('1:1')).toMatchObject({
      strokes: [SOLID(0.2)],
      strokeAlign: 'INSIDE',
      dashPattern: [4, 2],
      strokeTopWeight: 1,
      strokeRightWeight: 0,
      strokeBottomWeight: 2,
      strokeLeftWeight: 0,
    });
  });

  it('resolves bound variables at capture, so no undo has to ask Figma for one', async () => {
    const { figmaCtx } = makeFigma({
      '1:1': {
        id: '1:1',
        opacity: 0.5,
        boundVariables: { opacity: { type: 'VARIABLE_ALIAS', id: 'V:half' } },
        setBoundVariable: vi.fn<(f: string, v: unknown) => void>(),
      },
      F: { id: 'F', fills: [] },
    });
    const getVariableByIdAsync = vi.fn<(id: string) => Promise<unknown>>(async id => ({ id }));
    let applying = false;
    const ctx = {
      ...figmaCtx,
      variables: {
        getVariableByIdAsync: async (id: string) => {
          if (applying) throw new Error('an undo must not resolve a variable');
          return getVariableByIdAsync(id);
        },
      },
    } as unknown as typeof figma;
    const handler = createBatchHandler(ctx, {
      ...realWrites(ctx),
      set_fills: async (params: unknown) => {
        applying = true;
        return createSetFillsHandler(ctx)(params);
      },
    });

    await expect(
      handler({ ops: [{ tool: 'set_opacity', params: { nodeId: '1:1', opacity: 0.2 } }, FAIL] }),
    ).rejects.toThrow(/rolled back 1 applied op\(s\)/);
    expect(getVariableByIdAsync).toHaveBeenCalledWith('V:half');
  });
});
