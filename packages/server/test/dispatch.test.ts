import { ErrorCode, type RpcResponse } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { dispatchTool } from '../src/dispatch.js';
import type { Follower } from '../src/election/follower.js';
import { NodeRole } from '../src/election/node-role.js';
import type { Node } from '../src/election/node.js';
import { portConflictMessage } from '../src/election/port-conflict-message.js';
import { captureNotices } from '../src/tools/result/notices.js';

const makeNode = (overrides: Partial<Node>): Node =>
  ({
    isConflicted: () => false,
    port: 3055,
    conflictMessage: portConflictMessage(3055),

    onRoleChange: () => () => {},
    ...overrides,
  }) as unknown as Node;
const makeFollower = (overrides: Partial<Follower>): Follower => overrides as unknown as Follower;

describe('dispatchTool', () => {
  it('routes to Relay.sendRequest when local node is leader', async () => {
    const calls: Array<{ name: string; args: unknown }> = [];
    const node = makeNode({
      isLeader: () => true,
      getLeader: () =>
        ({
          relay: {
            skewNotice: () => null,
            sendRequest: async (name: string, args: unknown) => {
              calls.push({ name, args });
              return { from: 'leader-relay', echoed: args };
            },
          },
          http: undefined as never,
          port: 0,
        }) as unknown as ReturnType<Node['getLeader']>,
    });
    const follower = makeFollower({});

    const result = await dispatchTool({ node, follower }, 'my_tool', { x: 1 });
    expect(result).toEqual({ from: 'leader-relay', echoed: { x: 1 } });
    expect(calls).toEqual([{ name: 'my_tool', args: { x: 1 } }]);
  });

  it('fails fast with an actionable error when the node is port-conflicted', async () => {
    const node = makeNode({
      isConflicted: () => true,
      port: 3055,
      isLeader: () => false,
      conflictMessage: portConflictMessage(3055, {
        pid: 4242,
        buildId: 1,
        serverVersion: '0.4.0',
        stopped: true,
        resumed: true,
      }),
    });
    let forwarded = false;
    const follower = makeFollower({
      sendRpc: async (): Promise<RpcResponse> => {
        forwarded = true;
        return { kind: 'ok', requestId: 'r', result: null };
      },
    });

    await expect(dispatchTool({ node, follower }, 'get_document', {})).rejects.toThrow(
      /port 3055 is held by a Figma Forge server \(pid 4242/,
    );

    expect(forwarded).toBe(false);
  });

  it('cuts an in-flight follower call short when the election declares the port wedged', async () => {
    let announce: ((role: NodeRole) => void) | undefined;
    let conflicted = false;
    const node = makeNode({
      isLeader: () => false,
      isConflicted: () => conflicted,
      conflictMessage: portConflictMessage(3055, {
        pid: 4242,
        buildId: 1,
        serverVersion: '0.4.0',
        stopped: true,
        resumed: true,
      }),
      onRoleChange: (listener: (role: NodeRole) => void) => {
        announce = listener;
        return () => {};
      },
    });
    let aborted = false;
    const follower = makeFollower({
      sendRpc: async (
        _tool: string,
        _args?: unknown,
        _requestId?: string,
        _sessionId?: string,
        _timeoutMs?: number,
        abort?: AbortSignal,
      ): Promise<RpcResponse> => {
        await new Promise<void>(resolve => {
          abort?.addEventListener('abort', () => resolve(), { once: true });
        });
        aborted = true;
        return {
          kind: 'err',
          requestId: 'r',
          code: ErrorCode.Internal,
          message: 'follower rpc transport: This operation was aborted',
        };
      },
    });

    const call = dispatchTool({ node, follower }, 'get_document', {}, { retryDelayMs: 1 });
    await new Promise<void>(resolve => setTimeout(resolve, 10));
    conflicted = true;
    announce?.(NodeRole.Conflicted);

    await expect(call).rejects.toThrow(/pid 4242/);
    expect(aborted).toBe(true);
  });

  it('retries normally once the conflict clears, instead of reusing a spent abort', async () => {
    let announce: ((role: NodeRole) => void) | undefined;
    let conflicted = false;
    const node = makeNode({
      isLeader: () => false,
      isConflicted: () => conflicted,
      onRoleChange: (listener: (role: NodeRole) => void) => {
        announce = listener;
        return () => {};
      },
    });

    const seen: Array<boolean | undefined> = [];
    let attempt = 0;
    const follower = makeFollower({
      sendRpc: async (
        _tool: string,
        _args?: unknown,
        _requestId?: string,
        _sessionId?: string,
        _timeoutMs?: number,
        abort?: AbortSignal,
      ): Promise<RpcResponse> => {
        attempt += 1;
        if (attempt === 1) {
          conflicted = true;
          announce?.(NodeRole.Conflicted);
          await new Promise<void>(resolve => {
            if (abort?.aborted === true) resolve();
            else abort?.addEventListener('abort', () => resolve(), { once: true });
          });
          seen.push(abort?.aborted);

          conflicted = false;
          return {
            kind: 'err',
            requestId: 'r',
            code: ErrorCode.Internal,
            message: 'follower rpc transport: This operation was aborted',
          };
        }

        seen.push(abort?.aborted);
        return { kind: 'ok', requestId: 'r', result: { recovered: true } };
      },
    });

    const call = dispatchTool({ node, follower }, 'get_document', {}, { retryDelayMs: 1 });

    await expect(call).resolves.toEqual({ recovered: true });

    expect(seen).toEqual([true, false]);
  });

  it('routes to Follower.sendRpc when local node is not leader', async () => {
    const node = makeNode({ isLeader: () => false, getLeader: () => null });
    let received: { tool: string; args: unknown } | null = null;
    const follower = makeFollower({
      sendRpc: async (tool: string, args?: unknown): Promise<RpcResponse> => {
        received = { tool, args };
        return { kind: 'ok', requestId: 'r', result: { from: 'follower' } };
      },
    });

    const result = await dispatchTool({ node, follower }, 'remote_tool', { y: 2 });
    expect(result).toEqual({ from: 'follower' });
    expect(received).toEqual({ tool: 'remote_tool', args: { y: 2 } });
  });

  it('warns on the leader path, attributed to the session that served the call', async () => {
    const asked: (string | undefined)[] = [];
    const node = makeNode({
      isLeader: () => true,
      getLeader: () =>
        ({
          relay: {
            sendRequest: async (
              _tool: string,
              _args: unknown,
              _timeout?: number,
              _sessionId?: string,
              onServed?: (served: string | undefined) => void,
            ): Promise<unknown> => {
              await new Promise(resolve => setTimeout(resolve, 0));
              onServed?.('sess-that-served');
              return { ok: true };
            },
            skewNotice: (id?: string) => {
              asked.push(id);
              return id === 'sess-that-served' ? 'plugin v0.3.0 is older than this server' : null;
            },
          },
          http: undefined as never,
          port: 0,
        }) as unknown as ReturnType<Node['getLeader']>,
    });
    let seen: string | null = null;

    await captureNotices(
      async () => {
        await dispatchTool({ node, follower: makeFollower({}) }, 'set_fills', {});
        return { content: [] };
      },
      (result, notices) => {
        seen = notices.skew;
        return result;
      },
    );

    expect(asked).toEqual(['sess-that-served']);
    expect(seen).toMatch(/older than this server/);
  });

  it('carries the leader’s skew warning back to a follower', async () => {
    const node = makeNode({ isLeader: () => false, getLeader: () => null });
    const follower = makeFollower({
      sendRpc: async (): Promise<RpcResponse> => ({
        kind: 'ok',
        requestId: 'r',
        result: { ok: true },
        notice: 'Figma Forge plugin v0.3.0 is older than this server (v0.4.0).',
      }),
    });
    let seen: string | null = null;

    await captureNotices(
      async () => {
        await dispatchTool({ node, follower }, 'set_fills', {});
        return { content: [] };
      },
      (result, notices) => {
        seen = notices.skew;
        return result;
      },
    );

    expect(seen).toMatch(/older than this server/);
  });

  it('reports no skew when the leader attaches none', async () => {
    const node = makeNode({ isLeader: () => false, getLeader: () => null });
    const follower = makeFollower({
      sendRpc: async (): Promise<RpcResponse> => ({ kind: 'ok', requestId: 'r', result: {} }),
    });
    let seen: string | null = 'unset';

    await captureNotices(
      async () => {
        await dispatchTool({ node, follower }, 'set_fills', {});
        return { content: [] };
      },
      (result, notices) => {
        seen = notices.skew;
        return result;
      },
    );

    expect(seen).toBeNull();
  });
});
