import { ErrorCode, type RpcResponse } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { DispatchError, dispatchTool } from '../../src/dispatch/dispatch.js';
import type { Follower } from '../../src/election/follower.js';
import type { Node } from '../../src/election/node.js';
import { portConflictMessage } from '../../src/election/port-conflict-message.js';

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
  it('throws DispatchError immediately on non-transient follower error', async () => {
    const node = makeNode({ isLeader: () => false, getLeader: () => null });
    const follower = makeFollower({
      sendRpc: async (): Promise<RpcResponse> => ({
        kind: 'err',
        requestId: 'r',
        code: ErrorCode.InvalidParams,
        message: 'bad input',
      }),
    });

    await expect(dispatchTool({ node, follower }, 'x', undefined)).rejects.toMatchObject({
      name: 'DispatchError',
      code: ErrorCode.InvalidParams,
      message: 'bad input',
    });
  });

  it('retries transient follower transport error and eventually succeeds', async () => {
    const node = makeNode({ isLeader: () => false, getLeader: () => null });
    let attempts = 0;
    const follower = makeFollower({
      sendRpc: async (): Promise<RpcResponse> => {
        attempts += 1;
        if (attempts < 2) {
          return {
            kind: 'err',
            requestId: 'r',
            code: ErrorCode.Internal,
            message: 'follower rpc transport: ECONNREFUSED',
          };
        }
        return { kind: 'ok', requestId: 'r', result: { ok: 'after-retry' } };
      },
    });

    const result = await dispatchTool({ node, follower }, 'x', {}, { retryDelayMs: 5 });
    expect(result).toEqual({ ok: 'after-retry' });
    expect(attempts).toBe(2);
  });

  it('retries a "relay stopping" rejection (leader shutting down / abdicating) and recovers', async () => {
    const node = makeNode({ isLeader: () => false, getLeader: () => null });
    let attempts = 0;
    const follower = makeFollower({
      sendRpc: async (): Promise<RpcResponse> => {
        attempts += 1;
        if (attempts < 2) {
          return {
            kind: 'err',
            requestId: 'r',
            code: ErrorCode.Internal,
            message: 'relay stopping (pending get_document)',
          };
        }

        return { kind: 'ok', requestId: 'r', result: { from: 'new-leader' } };
      },
    });

    const result = await dispatchTool({ node, follower }, 'get_document', {}, { retryDelayMs: 5 });
    expect(result).toEqual({ from: 'new-leader' });
    expect(attempts).toBe(2);
  });

  it('switches from follower to leader path when role changes mid-retry', async () => {
    let attempts = 0;
    const leaderResult = { from: 'new-leader' };
    const node = makeNode({
      isLeader: () => attempts >= 1,
      getLeader: () =>
        attempts >= 1
          ? ({
              relay: {
                skewNotice: () => null,
                sendRequest: async (): Promise<unknown> => leaderResult,
              },
              http: undefined as never,
              port: 0,
            } as unknown as ReturnType<Node['getLeader']>)
          : null,
    });
    const follower = makeFollower({
      sendRpc: async (): Promise<RpcResponse> => {
        attempts += 1;
        return {
          kind: 'err',
          requestId: 'r',
          code: ErrorCode.Internal,
          message: 'follower rpc transport: fetch failed',
        };
      },
    });

    const result = await dispatchTool({ node, follower }, 'x', {}, { retryDelayMs: 5 });
    expect(result).toBe(leaderResult);
    expect(attempts).toBe(1);
  });

  it('exhausts retries and throws when transient persists', async () => {
    const node = makeNode({ isLeader: () => false, getLeader: () => null });
    let attempts = 0;
    const follower = makeFollower({
      sendRpc: async (): Promise<RpcResponse> => {
        attempts += 1;
        return {
          kind: 'err',
          requestId: 'r',
          code: ErrorCode.Internal,
          message: 'follower rpc transport: ECONNREFUSED',
        };
      },
    });

    await expect(
      dispatchTool({ node, follower }, 'x', {}, { retryDelayMs: 1, maxAttempts: 2 }),
    ).rejects.toBeInstanceOf(DispatchError);
    expect(attempts).toBe(2);
  });

  it('threads opts.sessionId into Relay.sendRequest on the leader path', async () => {
    let pinned: string | undefined = 'unset';
    const node = makeNode({
      isLeader: () => true,
      getLeader: () =>
        ({
          relay: {
            skewNotice: () => null,
            sendRequest: async (_n: string, _a: unknown, _t?: number, sessionId?: string) => {
              pinned = sessionId;
              return { ok: true };
            },
          },
          http: undefined as never,
          port: 0,
        }) as unknown as ReturnType<Node['getLeader']>,
    });
    await dispatchTool({ node, follower: makeFollower({}) }, 'x', {}, { sessionId: 'sess-7' });
    expect(pinned).toBe('sess-7');
  });

  it('threads opts.sessionId into Follower.sendRpc on the follower path', async () => {
    let pinned: string | undefined = 'unset';
    const node = makeNode({ isLeader: () => false, getLeader: () => null });
    const follower = makeFollower({
      sendRpc: async (
        _t: string,
        _a?: unknown,
        _r?: string,
        sessionId?: string,
      ): Promise<RpcResponse> => {
        pinned = sessionId;
        return { kind: 'ok', requestId: 'r', result: {} };
      },
    });
    await dispatchTool({ node, follower }, 'x', {}, { sessionId: 'sess-9' });
    expect(pinned).toBe('sess-9');
  });
});
