import type { CreateResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createRepeatNodesHandler } from '../../../src/features/nodes/repeat-nodes.handler.js';
import { setup, LINEAR } from './repeat-fake.js';

describe('repeat_nodes handler', () => {
  it('wraps the nodes at the topmost one’s index, filling in Figma’s defaults', async () => {
    const t = setup();
    const result = (await createRepeatNodesHandler(t.ctx)({
      nodeIds: ['1:3', '1:1'],
      modifiers: [LINEAR, { type: 'REPEAT', repeatType: 'RADIAL', count: 12, offset: 70 }],
    })) as CreateResult;
    expect(t.transformGroup).toHaveBeenCalledWith([t.a, t.top], t.parent, 2, [
      {
        type: 'REPEAT',
        unitType: 'PIXELS',
        offset: 10,
        count: 3,
        repeatType: 'LINEAR',
        axis: 'HORIZONTAL',
      },
      { type: 'REPEAT', unitType: 'PIXELS', offset: 70, count: 12, repeatType: 'RADIAL' },
    ]);
    expect(result).toEqual({
      ok: true,
      nodeId: '9:1',
      name: 'Repeat group',
      type: 'TRANSFORM_GROUP',
    });
  });

  it.each([
    [[], 'at least one modifier'],
    [[LINEAR, LINEAR, LINEAR], 'at most 2'],
    [[{ ...LINEAR, count: 1 }], 'from 2 to 40'],
    [[{ ...LINEAR, count: 41 }], 'from 2 to 40'],
    [[{ ...LINEAR, count: 2.5 }], 'from 2 to 40'],
    [[{ repeatType: 'RADIAL', count: 4, offset: 10, axis: 'VERTICAL' }], 'takes no axis'],
    [[{ ...LINEAR, repeatType: 'SPIRAL' }], '"LINEAR"|"RADIAL"'],
    [[{ ...LINEAR, type: 'SKEW' }], 'expected "REPEAT"'],
    [[{ ...LINEAR, offset: Number.NaN }], 'offset: Invalid input: expected number'],
  ])('refuses %j before touching the canvas', async (modifiers, message) => {
    const t = setup();
    await expect(createRepeatNodesHandler(t.ctx)({ nodeIds: ['1:1'], modifiers })).rejects.toThrow(
      message,
    );
    expect(t.transformGroup).not.toHaveBeenCalled();
  });
});
