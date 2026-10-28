import { describe, expect, it } from 'vitest';

import { createBatchHandler } from '../../../src/features/batch/batch.handler.js';
import { createSetVisibleHandler } from '../../../src/features/nodes/set-visible.handler.js';
import { createSetFillsHandler } from '../../../src/features/paint/set-fills.handler.js';
import { createSetReactionsHandler } from '../../../src/features/prototype/set-reactions.handler.js';
import { createUpdateFlowsHandler } from '../../../src/features/prototype/update-flows.handler.js';
import { makeFlowsFigma } from '../prototype/flows-fake.js';
import { FAIL } from './batch-fake.js';

describe('batch inverse for update_flows', () => {
  const setup = () => {
    const fake = makeFlowsFigma();
    const page = fake.makePage('P', 'Screens');
    for (const id of ['A', 'B', 'C', 'D']) fake.add({ id, type: 'FRAME', parent: page });
    fake.add({ id: 'F', type: 'FRAME', parent: page, fills: [] });
    page.flowStartingPoints = [
      { nodeId: 'A', name: 'Sign up' },
      { nodeId: 'B', name: 'Checkout' },
      { nodeId: 'C', name: 'Checkout' },
    ];
    const before = page.flowStartingPoints;
    const handler = createBatchHandler(fake.figmaCtx, {
      update_flows: createUpdateFlowsHandler(fake.figmaCtx),
      set_visible: createSetVisibleHandler(fake.figmaCtx),
      set_fills: createSetFillsHandler(fake.figmaCtx),
    });
    return { ...fake, page, before, handler };
  };

  it('puts back every rename, addition, removal and move', async () => {
    const { page, before, handler } = setup();
    await expect(
      handler({
        ops: [
          {
            tool: 'update_flows',
            params: {
              pageId: 'P',
              flows: [
                { nodeId: 'A', name: 'Onboarding' },
                { nodeId: 'D', name: 'Settings' },
              ],
              remove: ['B'],
              order: ['D', 'C'],
            },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 1 applied op\(s\): /);
    expect(page.flowStartingPoints).toEqual(before);
    expect(page.stored).toEqual(before);
  });

  it('restores two update_flows ops on the same page to the list the batch found', async () => {
    const { page, before, handler } = setup();
    await expect(
      handler({
        ops: [
          { tool: 'update_flows', params: { pageId: 'P', flows: [{ nodeId: 'D', name: 'x' }] } },
          {
            tool: 'update_flows',
            params: { pageId: 'P', flows: [{ nodeId: 'D', name: 'y' }], order: ['D'] },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 2 applied op\(s\): /);
    expect(page.flowStartingPoints).toEqual(before);
  });

  it('restores the order when an earlier op hid one of the flows', async () => {
    const { page, before, handler } = setup();
    await expect(
      handler({
        ops: [
          { tool: 'set_visible', params: { nodeId: 'B', visible: false } },
          {
            tool: 'update_flows',
            params: { pageId: 'P', flows: [{ nodeId: 'C', name: 'Guest' }], order: ['C'] },
          },
          FAIL,
        ],
      }),
    ).rejects.toThrow(/rolled back 2 applied op\(s\): /);
    expect(page.flowStartingPoints).toEqual(before);
  });

  it('reports a restore Figma refuses as residue instead of a clean rollback', async () => {
    const { page, nodes, handler } = setup();
    const store = Object.getOwnPropertyDescriptor(page, 'flowStartingPoints')!;
    let writes = 0;
    Object.defineProperty(page, 'flowStartingPoints', {
      get: store.get!,
      set: (next: unknown) => {
        writes += 1;
        if (writes > 1) throw new Error('in set_flowStartingPoints: refused');
        store.set!(next);
      },
    });
    nodes.get('D')!.visible = true;

    await expect(
      handler({
        ops: [{ tool: 'update_flows', params: { pageId: 'P', remove: ['A'] } }, FAIL],
      }),
    ).rejects.toThrow(
      /rolled back 1 applied op\(s\) \(restored with residue: flows: page P flows not restored: in set_flowStartingPoints: refused\)/,
    );
  });

  it('takes back a flow Figma added on its own when the connection that caused it is rolled back', async () => {
    const fake = makeFlowsFigma();
    const page = fake.makePage('P', 'Screens');
    const card = fake.add({ id: 'CARD', type: 'FRAME', parent: page });
    fake.add({ id: 'BUTTON', type: 'FRAME', parent: card });
    fake.add({ id: 'NEXT', type: 'FRAME', parent: page });
    fake.add({ id: 'F', type: 'FRAME', parent: page, fills: [] });
    const handler = createBatchHandler(fake.figmaCtx, {
      set_reactions: createSetReactionsHandler(fake.figmaCtx),
      set_fills: createSetFillsHandler(fake.figmaCtx),
    });
    const reaction = {
      trigger: { type: 'ON_CLICK' },
      actions: [{ type: 'NODE', destinationId: 'NEXT', navigation: 'NAVIGATE', transition: null }],
    };

    const error = await Promise.resolve(
      handler({
        ops: [{ tool: 'set_reactions', params: { nodeId: 'BUTTON', reactions: [reaction] } }, FAIL],
      }),
    ).then(
      () => 'resolved',
      (e: unknown) => (e as Error).message,
    );

    expect(error).toMatch(/rolled back 1 applied op\(s\): /);
    expect(error).not.toMatch(/residue/);
    expect(fake.nodes.get('BUTTON')!.reactions).toEqual([]);
    expect(page.flowStartingPoints).toEqual([]);
    expect(page.stored).toEqual([]);
  });

  it('leaves a flow Figma added on its own when the batch succeeds', async () => {
    const fake = makeFlowsFigma();
    const page = fake.makePage('P', 'Screens');
    fake.add({ id: 'CARD', type: 'FRAME', parent: page });
    fake.add({ id: 'NEXT', type: 'FRAME', parent: page });
    const handler = createBatchHandler(fake.figmaCtx, {
      set_reactions: createSetReactionsHandler(fake.figmaCtx),
    });
    await handler({
      ops: [
        {
          tool: 'set_reactions',
          params: {
            nodeId: 'CARD',
            reactions: [
              {
                trigger: { type: 'ON_CLICK' },
                actions: [
                  { type: 'NODE', destinationId: 'NEXT', navigation: 'NAVIGATE', transition: null },
                ],
              },
            ],
          },
        },
      ],
    });
    expect(page.flowStartingPoints).toEqual([{ nodeId: 'CARD', name: 'Flow 1' }]);
  });

  it('refuses at capture a pageId that is not a page, before anything runs', async () => {
    const { page, before, handler } = setup();
    await expect(
      handler({
        ops: [
          { tool: 'update_flows', params: { pageId: 'P', remove: ['A'] } },
          { tool: 'update_flows', params: { pageId: 'A' } },
        ],
      }),
    ).rejects.toThrow(/batch\/update_flows: A is not a page/);
    expect(page.flowStartingPoints).toEqual(before);
  });
});
