import { afterEach, describe, expect, it } from 'vitest';

import { AbdicationOutcome } from '../../src/election/abdication-outcome.js';
import { Election } from '../../src/election/election.js';
import { Follower } from '../../src/election/follower.js';
import { NodeRole } from '../../src/election/node-role.js';
import { Node } from '../../src/election/node.js';
import {
  buildElection,
  cleanupElections,
  freePort,
  startLeaderHarness,
  startLeaderWithElection,
  trackElection,
  trackNode,
} from './election-harness.js';

afterEach(cleanupElections);

describe('Election: newest build wins', () => {
  it('a follower on a newer build takes over from a stale leader, which stays demoted', async () => {
    const port = await freePort();
    const old = await startLeaderWithElection(port, 100);
    const { node, election } = buildElection(port, { pingTimeoutMs: 200, buildId: 200 });

    await election.determineRole();
    expect(node.role).toBe(NodeRole.Follower);

    await election.tickOnce();
    expect(node.role).toBe(NodeRole.Leader);
    expect(node.getLeader()?.port).toBe(port);
    expect(old.node.role).toBe(NodeRole.Follower);

    await old.election.tickOnce();
    expect(old.node.role).toBe(NodeRole.Follower);
    expect(node.role).toBe(NodeRole.Leader);
  });

  it('equal builds never challenge', async () => {
    const port = await freePort();
    const old = await startLeaderWithElection(port, 100);
    const { node, election } = buildElection(port, { pingTimeoutMs: 200, buildId: 100 });
    await election.determineRole();
    await election.tickOnce();
    expect(node.role).toBe(NodeRole.Follower);
    expect(old.node.role).toBe(NodeRole.Leader);
  });

  it('a busy leader defers the handoff (challenger retries on later ticks)', async () => {
    const port = await freePort();
    const old = await startLeaderWithElection(port, 100);
    const pending = old.node
      .getLeader()
      ?.relay.sendRequest('slow_tool', {}, 1_500)
      .catch(() => {});
    const { node, election } = buildElection(port, { pingTimeoutMs: 200, buildId: 200 });
    await election.determineRole();
    await election.tickOnce();
    expect(node.role).toBe(NodeRole.Follower);
    expect(old.node.role).toBe(NodeRole.Leader);
    await pending;
  });

  it('a pre-abdication leader stays; the challenger backs off instead of spamming', async () => {
    const port = await freePort();
    await startLeaderHarness(port);
    const logs: string[] = [];
    const { node, election } = buildElection(port, {
      pingTimeoutMs: 200,
      buildId: 200,
      log: msg => logs.push(msg),
    });
    await election.determineRole();

    await election.tickOnce();
    await election.tickOnce();
    expect(node.role).toBe(NodeRole.Follower);
    const manualRetirements = logs.filter(l => l.includes('retired manually')).length;
    expect(manualRetirements).toBe(1);
  });

  it('yieldLeadership opens a window where the ex-leader will not re-take the free port', async () => {
    const port = await freePort();
    const old = await startLeaderWithElection(port, 100);
    old.election.yieldLeadership();
    expect(old.node.role).toBe(NodeRole.Follower);

    await old.election.tickOnce();
    expect(old.node.role).toBe(NodeRole.Follower);
  });

  it('yieldLeadership is a no-op unless leading', async () => {
    const port = await freePort();
    const { node, election } = buildElection(port, { pingTimeoutMs: 200, buildId: 100 });
    election.yieldLeadership();
    expect(node.role).toBe(NodeRole.Unknown);
  });

  it('overlapping ticks coalesce — a second tick while one is in flight is a no-op', async () => {
    const port = await freePort();
    const node = trackNode(new Node({ serverVersion: 'x', port }));
    let pings = 0;
    const follower = {
      ping: async () => {
        pings += 1;
        await new Promise(r => setTimeout(r, 50));
        return false;
      },
      leaderInfo: async () => {
        pings += 1;
        await new Promise(r => setTimeout(r, 50));
        return undefined;
      },
      requestAbdication: async () => AbdicationOutcome.Error,
    } as unknown as Follower;
    const election = trackElection(new Election({ node, follower, tickIntervalMs: 1_000_000 }));
    node.becomeFollower();

    await Promise.all([election.tickOnce(), election.tickOnce()]);
    expect(pings).toBe(1);
    expect(node.role).toBe(NodeRole.Leader);
  });
});
