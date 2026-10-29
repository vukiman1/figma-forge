import { describe, expect, it } from 'vitest';

import { createBatchHandler } from '../../../src/features/batch/batch.handler.js';
import { createFlipNodesHandler } from '../../../src/features/nodes/flip-nodes.handler.js';
import { createSetFillsHandler } from '../../../src/features/paint/set-fills.handler.js';
import { makeFigma, FAIL } from './batch-fake.js';

describe('batch inverse for flip_nodes', () => {
  it('puts each flipped node’s transform back', async () => {
    const { figmaCtx, store } = makeFigma({
      A: {
        id: 'A',
        width: 100,
        height: 40,
        relativeTransform: [
          [1, 0, 10],
          [0, 1, 20],
        ],
      },
      B: {
        id: 'B',
        width: 30,
        height: 30,
        relativeTransform: [
          [0, 1, 50],
          [-1, 0, 80],
        ],
      },
      F: { id: 'F', fills: [] },
    });
    const handler = createBatchHandler(figmaCtx, {
      flip_nodes: createFlipNodesHandler(figmaCtx),
      set_fills: createSetFillsHandler(figmaCtx),
    });
    await expect(
      handler({
        ops: [{ tool: 'flip_nodes', params: { nodeIds: ['A', 'B'], axis: 'VERTICAL' } }, FAIL],
      }),
    ).rejects.toThrow(/rolled back 1/);
    expect(store.get('A')!.relativeTransform).toEqual([
      [1, 0, 10],
      [0, 1, 20],
    ]);
    expect(store.get('B')!.relativeTransform).toEqual([
      [0, 1, 50],
      [-1, 0, 80],
    ]);
  });
});
