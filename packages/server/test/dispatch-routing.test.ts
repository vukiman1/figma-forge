import { afterEach, describe, expect, it } from 'vitest';

import { dispatchTargeted, resolveRoutingSession } from '../src/dispatch.js';
import type { Follower } from '../src/election/follower.js';
import type { Node } from '../src/election/node.js';
import { portConflictMessage } from '../src/election/port-conflict-message.js';
import type { PluginSessionInfo } from '../src/routing/sessions.js';
import { clearFileTarget, setFileTarget } from '../src/routing/target.js';

const makeNode = (overrides: Partial<Node>): Node =>
  ({
    isConflicted: () => false,
    port: 3055,
    conflictMessage: portConflictMessage(3055),

    onRoleChange: () => () => {},
    ...overrides,
  }) as unknown as Node;
const makeFollower = (overrides: Partial<Follower>): Follower => overrides as unknown as Follower;

describe('resolveRoutingSession', () => {
  it('resolves locally from the relay when leader', async () => {
    const node = makeNode({
      isLeader: () => true,
      getLeader: () =>
        ({
          relay: { pickActiveSessionId: () => 'leader-sess' },
          http: undefined as never,
          port: 0,
        }) as unknown as ReturnType<Node['getLeader']>,
    });
    expect(await resolveRoutingSession({ node, follower: makeFollower({}) })).toBe('leader-sess');
  });

  it('asks the leader over the follower when not leader', async () => {
    const node = makeNode({ isLeader: () => false, getLeader: () => null });
    const follower = makeFollower({ resolveActiveSession: async () => 'remote-sess' });
    expect(await resolveRoutingSession({ node, follower })).toBe('remote-sess');
  });
});

describe('dispatchTargeted', () => {
  const info = (id: string, fileName: string): PluginSessionInfo => ({
    id,
    fileName,
    pageName: 'Page 1',
    lastActivityAt: 1,
    pluginVersion: '0.5.0',
  });

  const leaderServing = (
    live: string,
    sessions: readonly PluginSessionInfo[],
    seen: string[],
  ): Node =>
    makeNode({
      isLeader: () => true,
      getLeader: () =>
        ({
          relay: {
            skewNotice: () => null,
            listSessionInfo: () => sessions,
            sendRequest: async (
              name: string,
              _args: unknown,
              _timeout: number,
              sessionId?: string,
            ) => {
              seen.push(`${name}:${sessionId ?? '(unpinned)'}`);
              if (sessionId !== undefined && sessionId !== live) {
                throw new Error(`pinned session not connected (sessionId=${sessionId}, method=t)`);
              }

              if (name === 'list_files') {
                return {
                  files: [
                    {
                      fileKey: null,
                      fileName: sessions.find(x => x.id === sessionId)?.fileName ?? null,
                      currentPage: { id: 'p', name: 'Page 1' },
                    },
                  ],
                };
              }
              return { served: sessionId };
            },
          },
          http: undefined as never,
          port: 0,
        }) as unknown as ReturnType<Node['getLeader']>,
    });

  afterEach(() => {
    clearFileTarget();
  });

  it('dispatches unpinned when no file is claimed', async () => {
    const seen: string[] = [];
    const node = leaderServing('s-1', [info('s-1', 'Brand')], seen);
    await dispatchTargeted({ node, follower: makeFollower({}) }, 't', {});
    expect(seen).toEqual(['t:(unpinned)']);
  });

  it('pins straight to the claimed session without a liveness round-trip first', async () => {
    const seen: string[] = [];
    const node = leaderServing('s-2', [info('s-2', 'Marketing')], seen);
    setFileTarget({ sessionId: 's-2', fileName: 'Marketing' });
    await dispatchTargeted({ node, follower: makeFollower({}) }, 't', {});

    expect(seen).toEqual(['t:s-2']);
  });

  it('recovers the claim by file name when the panel was reopened, then retries', async () => {
    const seen: string[] = [];

    const node = leaderServing('s-9', [info('s-9', 'Marketing')], seen);
    setFileTarget({ sessionId: 's-2', fileName: 'Marketing' });
    const result = await dispatchTargeted({ node, follower: makeFollower({}) }, 't', {});

    expect(seen).toEqual(['t:s-2', 'list_files:s-9', 't:s-9']);
    expect(result).toEqual({ served: 's-9' });
  });

  it('fails rather than falling back to another file when the claim cannot be recovered', async () => {
    const seen: string[] = [];
    const node = leaderServing('s-3', [info('s-3', 'Brand')], seen);
    setFileTarget({ sessionId: 's-2', fileName: 'Marketing' });
    await expect(dispatchTargeted({ node, follower: makeFollower({}) }, 't', {})).rejects.toThrow(
      /"Marketing" is no longer connected/,
    );

    expect(seen).toEqual(['t:s-2', 'list_files:s-3']);
  });
});
