import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createHostYield } from '../../protocol/host-yield.js';
import { createSearchNodesHandler } from '../../src/features/read/search-nodes.handler.js';
import { resetThrottleForTests, resumeHostYield } from '../../src/runtime/cooperative.js';
import { serializeTrees } from '../../src/serialize/serialize-runs.js';
import {
  deliver,
  relayMocks,
  setVisibility,
  unmountAll,
  unmountLatest,
  withSession,
} from './relay-session-fake.js';

const NODE_COUNT = 1025;
const GETTER_COST_MS = 20;
const MAX_HOST_TURN_GAP_MS = 290;

interface SerializedRead {
  readonly nodes: ReadonlyArray<{ id: string; mainComponent: { id: string } }>;
}

const slowInstances = (clock: { elapsed: number }): SceneNode[] =>
  Array.from({ length: NODE_COUNT }, (_, index) => ({
    id: `2:${index}`,
    type: 'INSTANCE',
    get name() {
      clock.elapsed += GETTER_COST_MS;
      return `Instance ${index}`;
    },
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    get width() {
      clock.elapsed += GETTER_COST_MS;
      return 10;
    },
    height: 10,
    parent: null,
    getMainComponentAsync: async () => ({
      id: `3:${index}`,
      name: `Main ${index}`,
      key: `key-${index}`,
      parent: null,
    }),
  })) as unknown as SceneNode[];

const largestGap = (turns: readonly number[]): number =>
  Math.max(...turns.slice(1).map((at, index) => at - (turns[index] ?? 0)));

describe('useRelaySession host yields', () => {
  beforeEach(async () => {
    await setVisibility('visible');
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each(['search', 'tree'] as const)(
    'answers yield requests inside the host message task, so a large hidden %s read completes while hidden timers never run',
    async kind => {
      await setVisibility('hidden');
      resetThrottleForTests();
      const clock = { elapsed: 0 };
      vi.spyOn(Date, 'now').mockImplementation(() => clock.elapsed);
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const hostTurns: number[] = [0];
      const postMessage = vi.fn<(pluginMessage: unknown) => void>(pluginMessage => {
        hostTurns.push(clock.elapsed);
        queueMicrotask(() => deliver(pluginMessage));
      });
      const nodes = slowInstances(clock);
      const figmaCtx = {
        ui: { postMessage },
        currentPage: { children: nodes },
      } as unknown as typeof figma;
      vi.stubGlobal('figma', figmaCtx);
      const parentPost = vi.fn<(envelope: { pluginMessage: unknown }) => void>(envelope => {
        resumeHostYield(envelope.pluginMessage);
      });
      vi.stubGlobal('parent', { postMessage: parentPost });
      withSession();
      const initialTimers = vi.getTimerCount();

      const result =
        kind === 'search'
          ? await createSearchNodesHandler(figmaCtx)({ type: 'INSTANCE' })
          : await serializeTrees(nodes);
      const output = (result as SerializedRead).nodes;
      expect(output.map(node => node.id)).toEqual(nodes.map(node => node.id));
      expect(output.map(node => node.mainComponent.id)).toEqual(
        nodes.map((_, index) => `3:${index}`),
      );
      expect(parentPost).toHaveBeenCalledWith(
        { pluginMessage: createHostYield(expect.any(Number) as number, 'yield-resume', true) },
        '*',
      );
      hostTurns.push(clock.elapsed);
      expect(largestGap(hostTurns)).toBeLessThanOrEqual(MAX_HOST_TURN_GAP_MS);
      expect(vi.getTimerCount()).toBe(initialTimers);
      expect(relayMocks.notifyActivity).not.toHaveBeenCalled();
    },
  );

  it('ignores unrelated traffic and stops replying after unmount', () => {
    const postMessage = vi.fn<(message: unknown, targetOrigin: string) => void>();
    vi.stubGlobal('parent', { postMessage });
    withSession();

    deliver(createHostYield(1, 'yield-resume'));
    deliver({ tag: '@figma-forge/yield', kind: 'yield-request', id: -1 });
    expect(postMessage).not.toHaveBeenCalled();
    deliver(createHostYield(1, 'yield-request'));
    expect(postMessage).toHaveBeenCalledExactlyOnceWith(
      { pluginMessage: createHostYield(1, 'yield-resume') },
      '*',
    );
    unmountLatest();
    deliver(createHostYield(2, 'yield-request'));
    expect(postMessage).toHaveBeenCalledTimes(1);
  });
});
