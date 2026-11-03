import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  dispatchTargeted,
  resetRoutingNoticeCache,
  resolveRoutingSession,
} from '../src/dispatch.js';
import type { Follower } from '../src/election/follower.js';
import type { Node } from '../src/election/node.js';
import { portConflictMessage } from '../src/election/port-conflict-message.js';
import type { PluginSessionInfo } from '../src/routing/sessions.js';
import { clearFileTarget, setFileTarget } from '../src/routing/target.js';
import { captureNotices, withRoutingNotice } from '../src/tools/notices.js';

const makeNode = (overrides: Partial<Node>): Node =>
  ({
    isConflicted: () => false,
    port: 3055,
    conflictMessage: portConflictMessage(3055),

    onRoleChange: () => () => {},
    ...overrides,
  }) as unknown as Node;
const makeFollower = (overrides: Partial<Follower>): Follower => overrides as unknown as Follower;

describe('ambiguous-routing notice', () => {
  const info = (id: string, fileName: string): PluginSessionInfo => ({
    id,
    fileName,
    pageName: 'Page 1',
    lastActivityAt: 1,
    pluginVersion: '0.5.0',
  });

  const leaderWith = (sessions: readonly PluginSessionInfo[]): Node =>
    makeNode({
      isLeader: () => true,
      getLeader: () =>
        ({
          relay: {
            skewNotice: () => null,
            listSessionInfo: () => sessions,
            pickActiveSessionId: () => sessions[0]?.id,
            sendRequest: async () => ({ ok: true }),
          },
          http: undefined as never,
          port: 0,
        }) as unknown as ReturnType<Node['getLeader']>,
    });

  const noticeFrom = async (run: () => Promise<unknown>): Promise<string> => {
    const result = await captureNotices(
      async () => {
        await run();
        return { content: [{ type: 'text' as const, text: '{}' }] };
      },

      (r, notices) => withRoutingNotice(r, notices.routing),
    );
    return result.content.map(c => (c.type === 'text' ? c.text : '')).join('');
  };

  beforeEach(() => {
    resetRoutingNoticeCache();
    clearFileTarget();
  });

  afterEach(() => {
    clearFileTarget();
  });

  it('warns when two files are open and nothing is claimed', async () => {
    const node = leaderWith([info('s-1', 'Brand'), info('s-2', 'Marketing')]);
    const text = await noticeFrom(() =>
      dispatchTargeted({ node, follower: makeFollower({}) }, 't', {}),
    );
    expect(text).toContain('MORE THAN ONE FIGMA FILE IS OPEN');
    expect(text).toContain('Brand');
    expect(text).toContain('Marketing');
    expect(text).toContain('use_file');
  });

  it('says nothing when only one file is open', async () => {
    const node = leaderWith([info('s-1', 'Brand')]);
    const text = await noticeFrom(() =>
      dispatchTargeted({ node, follower: makeFollower({}) }, 't', {}),
    );
    expect(text).not.toContain('MORE THAN ONE');
  });

  it('says nothing once a file is claimed', async () => {
    const node = leaderWith([info('s-1', 'Brand'), info('s-2', 'Marketing')]);
    setFileTarget({ sessionId: 's-2', fileName: 'Marketing' });
    const text = await noticeFrom(() =>
      dispatchTargeted({ node, follower: makeFollower({}) }, 't', {}),
    );
    expect(text).not.toContain('MORE THAN ONE');
  });

  it('warns on the multi-call path too, which pins even when unclaimed', async () => {
    const node = leaderWith([info('s-1', 'Brand'), info('s-2', 'Marketing')]);
    const text = await noticeFrom(() =>
      resolveRoutingSession({ node, follower: makeFollower({}) }),
    );
    expect(text).toContain('MORE THAN ONE FIGMA FILE IS OPEN');
  });

  it('names a session that has not reported its file yet', async () => {
    const node = leaderWith([info('s-1', 'Brand'), { ...info('s-2', 'x'), fileName: null }]);
    const text = await noticeFrom(() =>
      dispatchTargeted({ node, follower: makeFollower({}) }, 't', {}),
    );
    expect(text).toContain('(unnamed, session s-2)');
  });
});
