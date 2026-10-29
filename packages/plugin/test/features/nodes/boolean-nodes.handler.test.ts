import type { CreateResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createBooleanNodesHandler } from '../../../src/features/nodes/boolean-nodes.handler.js';
import { setup } from './shared-parent-fake.js';

describe('boolean_nodes handler', () => {
  it('runs the matching Figma operation under the shared parent, at the topmost operand’s index', async () => {
    const t = setup();
    const result = (await createBooleanNodesHandler(t.ctx)({
      operation: 'SUBTRACT',
      nodeIds: ['1:1', '1:2'],
      name: 'ring',
    })) as CreateResult;
    expect(t.subtract).toHaveBeenCalledWith([t.a, t.b], t.parent, 1);
    expect(t.union).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, nodeId: '9:2', name: 'ring', type: 'BOOLEAN_OPERATION' });
  });

  it.each([
    ['UNION', 'union'],
    ['INTERSECT', 'intersect'],
    ['EXCLUDE', 'exclude'],
  ] as const)('maps %s to figma.%s', async (operation, method) => {
    const t = setup();
    await createBooleanNodesHandler(t.ctx)({ operation, nodeIds: ['1:1', '1:3'] });
    expect(t[method]).toHaveBeenCalledWith([t.a, t.c], t.parent, 2);
  });

  it('hands Figma the operands bottom to top, whatever order the ids came in', async () => {
    const t = setup();
    await createBooleanNodesHandler(t.ctx)({ operation: 'UNION', nodeIds: ['1:3', '1:1'] });
    expect(t.union).toHaveBeenCalledWith([t.a, t.c], t.parent, 2);
  });

  it.each(['UNION', 'INTERSECT', 'EXCLUDE'] as const)(
    '%s paints the result with the topmost operand’s fill and effects, as Figma’s command does',
    async operation => {
      const t = setup();
      const shadow = { type: 'DROP_SHADOW', visible: true };
      t.c.effects = [shadow];
      const result = await createBooleanNodesHandler(t.ctx)({
        operation,
        nodeIds: ['1:3', '1:1'],
      });
      const made = t[operation.toLowerCase() as 'union'].mock.results[0]!.value as Record<
        string,
        unknown
      >;
      expect(result).toMatchObject({ ok: true });
      expect(made.fills).toBe(t.c.fills);
      expect(made.effects).toEqual([shadow]);
    },
  );

  it('SUBTRACT paints the result like the lowest operand, the shape being cut', async () => {
    const t = setup();
    await createBooleanNodesHandler(t.ctx)({ operation: 'SUBTRACT', nodeIds: ['1:3', '1:1'] });
    const made = t.subtract.mock.results[0]!.value as Record<string, unknown>;
    expect(made.fills).toBe(t.a.fills);
  });

  it('re-applies a fill or effect style as the style, not as its values', async () => {
    const t = setup();
    t.c.fillStyleId = 'S:fill';
    t.c.effectStyleId = 'S:fx';
    await createBooleanNodesHandler(t.ctx)({ operation: 'UNION', nodeIds: ['1:1', '1:3'] });
    const made = t.union.mock.results[0]!.value as Record<string, unknown>;
    expect(made).toMatchObject({ fillStyleId: 'S:fill', effectStyleId: 'S:fx' });
    expect((made.fills as { color: { r: number } }[])[0]!.color.r).toBe(0.85);
  });

  it('refuses nodes under different parents, naming the stray one', async () => {
    const t = setup();
    await expect(
      createBooleanNodesHandler(t.ctx)({ operation: 'UNION', nodeIds: ['1:1', '2:1'] }),
    ).rejects.toThrow(/2:1 is under a different one.*reparent_nodes/s);
    expect(t.union).not.toHaveBeenCalled();
  });

  it('rejects bad input and missing nodes', async () => {
    const t = setup();
    const handler = createBooleanNodesHandler(t.ctx);
    await expect(handler({ nodeIds: ['1:1', '1:2'] })).rejects.toThrow(/operation: /);
    await expect(handler({ operation: 'MERGE', nodeIds: ['1:1', '1:2'] })).rejects.toThrow(
      /operation: /,
    );
    await expect(handler({ operation: 'UNION', nodeIds: ['1:1'] })).rejects.toThrow(/at least 2/);
    await expect(handler({ operation: 'UNION', nodeIds: ['1:1', '1:1'] })).rejects.toThrow(
      /at least 2 distinct/,
    );
    await expect(handler({ operation: 'UNION', nodeIds: ['1:1', '9:9'] })).rejects.toThrow(
      /9:9 not found/,
    );
  });
});
