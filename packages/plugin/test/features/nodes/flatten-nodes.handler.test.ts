import type { CreateResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createFlattenNodesHandler } from '../../../src/features/nodes/flatten-nodes.handler.js';
import { setup } from './shared-parent-fake.js';

describe('flatten_nodes handler', () => {
  it('flattens a single node or several into one vector in place', async () => {
    const t = setup();
    const result = (await createFlattenNodesHandler(t.ctx)({
      nodeIds: ['1:2'],
      name: 'icon',
    })) as CreateResult;
    expect(t.flatten).toHaveBeenCalledWith([t.b], t.parent, 1);
    expect(result).toEqual({ ok: true, nodeId: '9:5', name: 'icon', type: 'VECTOR' });
  });

  it('passes a repeated id once', async () => {
    const t = setup();
    await createFlattenNodesHandler(t.ctx)({ nodeIds: ['1:2', '1:2', '1:1'] });
    expect(t.flatten).toHaveBeenCalledWith([t.a, t.b], t.parent, 1);
  });

  it('shares the one-parent rule and rejects bad input', async () => {
    const t = setup();
    const handler = createFlattenNodesHandler(t.ctx);
    await expect(handler({ nodeIds: ['1:1', '2:1'] })).rejects.toThrow(/share one parent/);
    await expect(handler({ nodeIds: [] })).rejects.toThrow(/nodeIds: /);
    await expect(handler({})).rejects.toThrow(/nodeIds: /);
  });
});
