import { DEFAULT_TOOL_BUDGET_MS, ErrorCode, HEAVY_TOOL_BUDGET_MS } from '@figma-forge/core';
import { describe, expect, it, vi } from 'vitest';

import {
  createToolError,
  createToolResult,
  isPluginBridgeMessage,
  type PluginBridgeMessage,
  PluginToolFailure,
} from '../../protocol/bridge.js';
import {
  createToolBridge,
  type PostMessageFn,
  type SubscribeFn,
} from '../../ui/sandbox/tool-bridge.js';

interface Harness {
  bridge: ReturnType<typeof createToolBridge>;
  sent: PluginBridgeMessage[];
  emit: (raw: unknown) => void;
}

const setup = (timeoutMs?: number): Harness => {
  const sent: PluginBridgeMessage[] = [];
  const emitter: { current: ((raw: unknown) => void) | null } = { current: null };
  const postMessage: PostMessageFn = msg => sent.push(msg);
  const subscribe: SubscribeFn = cb => {
    emitter.current = cb;
    return () => {
      emitter.current = null;
    };
  };
  const bridge = createToolBridge({
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
    postMessage,
    subscribe,
  });
  return {
    bridge,
    sent,
    emit: raw => emitter.current?.(raw),
  };
};

describe('createToolBridge', () => {
  it('posts a tagged tool-call when handler is invoked', async () => {
    const { bridge, sent, emit } = setup();
    const promise = bridge.handler('ping', { foo: 1 });
    expect(sent).toHaveLength(1);
    expect(isPluginBridgeMessage(sent[0])).toBe(true);
    expect(sent[0]).toMatchObject({
      kind: 'tool-call',
      method: 'ping',
      params: { foo: 1 },
    });
    emit(createToolResult({ id: sent[0]!.id, result: { pong: true } }));
    await expect(promise).resolves.toEqual({ pong: true });
    expect(bridge.pendingCount()).toBe(0);
  });

  it('rejects a tool-error as a PluginToolFailure whose code stays a field rather than folded into the message', async () => {
    const { bridge, sent, emit } = setup();
    const promise = bridge.handler('ping', undefined);
    emit(createToolError({ id: sent[0]!.id, code: 'BOOM', message: 'sandbox failed' }));
    await expect(promise).rejects.toThrow(PluginToolFailure);
    await expect(promise).rejects.toMatchObject({ code: 'BOOM', message: 'sandbox failed' });
    expect(bridge.pendingCount()).toBe(0);
  });

  it('times out when sandbox never replies', async () => {
    const { bridge } = setup(20);
    await expect(bridge.handler('ping', undefined)).rejects.toThrow(/timeout/);
  });

  it.each(['import_variable', 'import_style'])(
    'gives a %s import the heavy budget, then times out with a foreground retry hint while a late result never blocks the retry',
    async method => {
      vi.useFakeTimers();
      const { bridge, sent, emit } = setup();
      try {
        const answer = bridge.handler(method, {}).then(
          result => ({ result }),
          (error: unknown) => ({ error }),
        );
        await vi.advanceTimersByTimeAsync(DEFAULT_TOOL_BUDGET_MS + 1);
        expect(bridge.pendingCount()).toBe(1);
        await vi.advanceTimersByTimeAsync(HEAVY_TOOL_BUDGET_MS - DEFAULT_TOOL_BUDGET_MS);
        const outcome = await answer;
        expect(outcome).toMatchObject({ error: { code: ErrorCode.Timeout } });
        expect(outcome).toHaveProperty(
          'error.message',
          expect.stringMatching(/target Figma file.*foreground.*retry/),
        );
        expect(bridge.pendingCount()).toBe(0);

        emit(createToolResult({ id: sent[0]!.id, result: { ok: true } }));
        const retry = bridge.handler(method, {});
        emit(createToolResult({ id: sent[1]!.id, result: { ok: true } }));
        await expect(retry).resolves.toEqual({ ok: true });
        expect(bridge.pendingCount()).toBe(0);
      } finally {
        bridge.dispose();
        vi.useRealTimers();
      }
    },
  );

  it.each(['search_nodes', 'scan_nodes_by_types', 'scan_text_nodes', 'get_local_components'])(
    'keeps a large %s pending past the default window and accepts its result',
    async method => {
      vi.useFakeTimers();
      const { bridge, sent, emit } = setup();
      try {
        const promise = bridge.handler(method, {});
        const answer = promise.then(
          result => ({ result }),
          (error: unknown) => ({ error }),
        );
        await vi.advanceTimersByTimeAsync(DEFAULT_TOOL_BUDGET_MS + 1);
        emit(createToolResult({ id: sent[0]!.id, result: { nodes: [] } }));
        await expect(answer).resolves.toEqual({ result: { nodes: [] } });
        expect(bridge.pendingCount()).toBe(0);
      } finally {
        bridge.dispose();
        vi.useRealTimers();
      }
    },
  );

  it.each(['search_nodes', 'scan_nodes_by_types', 'scan_text_nodes', 'get_local_components'])(
    'still times out %s when it never answers within the heavy budget',
    async method => {
      vi.useFakeTimers();
      const { bridge } = setup();
      try {
        const promise = bridge.handler(method, {});
        const answer = promise.then(
          result => ({ result }),
          (error: unknown) => ({ error }),
        );
        await vi.advanceTimersByTimeAsync(HEAVY_TOOL_BUDGET_MS);
        await expect(answer).resolves.toEqual({
          error: new Error(`sandbox tool timeout (method=${method})`),
        });
        expect(bridge.pendingCount()).toBe(0);
      } finally {
        bridge.dispose();
        vi.useRealTimers();
      }
    },
  );

  it('ignores orphan replies for unknown ids', async () => {
    const log = vi.fn<(msg: string) => void>();
    const emitter: { current: ((raw: unknown) => void) | null } = { current: null };
    const bridge = createToolBridge({
      log,
      postMessage: () => {},
      subscribe: cb => {
        emitter.current = cb;
        return () => {
          emitter.current = null;
        };
      },
    });
    emitter.current?.(createToolResult({ id: 'never-sent', result: 1 }));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('orphan'));
    bridge.dispose();
  });

  it('ignores non-bridge messages such as Figma internals', () => {
    const { bridge, emit } = setup();
    void bridge.handler('ping', undefined).catch(() => {});

    emit({ pluginMessage: 'something else' });
    emit(undefined);
    emit({ tag: 'wrong', kind: 'tool-result', id: 'x' });

    expect(bridge.pendingCount()).toBe(1);
    bridge.dispose();
  });

  it('dispose rejects pending and unsubscribes', async () => {
    const { bridge } = setup();
    const promise = bridge.handler('ping', undefined);
    bridge.dispose();
    await expect(promise).rejects.toThrow(/disposed/);
    expect(bridge.pendingCount()).toBe(0);
  });
});
