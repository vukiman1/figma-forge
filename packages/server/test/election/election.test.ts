import { afterEach, describe, expect, it, vi } from 'vitest';

import { Election } from '../../src/election/election.js';
import { Follower } from '../../src/election/follower.js';
import { NodeRole } from '../../src/election/node-role.js';
import {
  buildElection,
  cleanupElections,
  freePort,
  squatPort,
  startLeaderHarness,
  stopLeaderHarness,
  trackElection,
} from './election-harness.js';

afterEach(cleanupElections);

describe('Election', () => {
  it('tick: leader does nothing', async () => {
    const port = await freePort();
    const h = await startLeaderHarness(port);
    const follower = new Follower({ leaderUrl: `http://127.0.0.1:${port}` });
    const election = trackElection(
      new Election({ node: h.node, follower, tickIntervalMs: 1_000_000 }),
    );
    await election.tickOnce();
    expect(h.node.role).toBe(NodeRole.Leader);
  });

  it('tick: healthy follower stays follower', async () => {
    const port = await freePort();
    await startLeaderHarness(port);
    const { node, election } = buildElection(port);
    await election.determineRole();
    expect(node.role).toBe(NodeRole.Follower);
    await election.tickOnce();
    expect(node.role).toBe(NodeRole.Follower);
  });

  it('tick: dead leader triggers takeover', async () => {
    const port = await freePort();
    const h = await startLeaderHarness(port);
    const { node, election } = buildElection(port);
    await election.determineRole();
    expect(node.role).toBe(NodeRole.Follower);

    await stopLeaderHarness(h);

    await election.tickOnce();
    expect(node.role).toBe(NodeRole.Leader);
    expect(node.getLeader()?.port).toBe(port);
  });

  it('determineRole: free port → leader', async () => {
    const port = await freePort();
    const { node, election } = buildElection(port);
    await election.determineRole();
    expect(node.role).toBe(NodeRole.Leader);
  });

  it('determineRole: port taken by responsive leader → follower', async () => {
    const port = await freePort();
    await startLeaderHarness(port);
    const { node, election } = buildElection(port);
    await election.determineRole();
    expect(node.role).toBe(NodeRole.Follower);
  });

  it('determineRole: port held by a non-Figma Forge process → conflicted, so no RPC is forwarded into a squatter', async () => {
    const port = await freePort();
    await squatPort(port);
    const { node, election } = buildElection(port, { pingTimeoutMs: 100 });
    await election.determineRole();
    expect(node.role).toBe(NodeRole.Conflicted);
  });

  it('tick: logs a bind error other than EADDRINUSE instead of throwing it, since an unhandled rejection would end the process', async () => {
    const port = await freePort();
    await squatPort(port);
    const logs: string[] = [];
    const { node, election } = buildElection(port, {
      pingTimeoutMs: 100,
      buildId: 0,
      log: msg => logs.push(msg),
    });
    await election.determineRole();
    expect(node.role).toBe(NodeRole.Conflicted);

    vi.spyOn(node, 'becomeLeader').mockRejectedValue(
      Object.assign(new Error('permission denied'), { code: 'EACCES' }),
    );
    await expect(election.tickOnce()).resolves.toBeUndefined();
    expect(logs.some(line => line.includes('tick failed: permission denied'))).toBe(true);
    expect(node.role).toBe(NodeRole.Conflicted);
  });

  it('tick: conflicted node takes the port once the squatter releases it', async () => {
    const port = await freePort();
    const releaseSquatter = await squatPort(port);
    const { node, election } = buildElection(port, { pingTimeoutMs: 100 });
    await election.determineRole();
    expect(node.role).toBe(NodeRole.Conflicted);

    await releaseSquatter();
    await election.tickOnce();
    expect(node.role).toBe(NodeRole.Leader);
  });

  it('tick: conflicted node follows once a real Figma Forge leader takes the port', async () => {
    const port = await freePort();
    const releaseSquatter = await squatPort(port);
    const { node, election } = buildElection(port, { pingTimeoutMs: 100 });
    await election.determineRole();
    expect(node.role).toBe(NodeRole.Conflicted);

    await releaseSquatter();
    await startLeaderHarness(port);
    await election.tickOnce();
    expect(node.role).toBe(NodeRole.Follower);
  });

  it('start() runs determineRole and stop() halts ticker', async () => {
    const port = await freePort();
    await startLeaderHarness(port);
    const { node, election } = buildElection(port);
    await election.start();
    expect(node.role).toBe(NodeRole.Follower);
    election.stop();
  });
});
