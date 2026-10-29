import { describe, expect, it } from 'vitest';

import { createSetRepeatHandler } from '../../../src/features/nodes/set-repeat.handler.js';
import { setup, LINEAR } from './repeat-fake.js';

describe('set_repeat handler', () => {
  it('replaces a repeat group’s modifiers, an empty list included', async () => {
    const t = setup();
    await createSetRepeatHandler(t.ctx)({ nodeId: '5:1', modifiers: [LINEAR] });
    expect(t.group.transformModifiers).toEqual([
      {
        type: 'REPEAT',
        unitType: 'PIXELS',
        offset: 10,
        count: 3,
        repeatType: 'LINEAR',
        axis: 'HORIZONTAL',
      },
    ]);
    await createSetRepeatHandler(t.ctx)({ nodeId: '5:1', modifiers: [] });
    expect(t.group.transformModifiers).toEqual([]);
  });

  it('refuses a node that is not a repeat group', async () => {
    const t = setup();
    await expect(
      createSetRepeatHandler(t.ctx)({ nodeId: '1:1', modifiers: [LINEAR] }),
    ).rejects.toThrow('not a repeat group');
  });
});
