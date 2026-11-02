import { afterEach, describe, expect, it } from 'vitest';

import { WEDGED_UNRESPONSIVE_TICKS } from '../../src/election/election-options.js';
import { attachLeaderEndpoints } from '../../src/election/leader-endpoints.js';
import { NodeRole } from '../../src/election/node-role.js';
import {
  buildElection,
  cleanupElections,
  freePort,
  lockPortToThisProcess,
  startLeaderHarness,
} from './election-harness.js';
import { fakeProbe } from './lock-fixtures.js';

afterEach(cleanupElections);

describe('Election: a leader that holds the port but stops answering', () => {
  it('stays a follower until the threshold, then declares the conflict', async () => {
    const port = await freePort();
    const h = await startLeaderHarness(port);
    const { node, election } = buildElection(port);
    await election.determineRole();
    expect(node.role).toBe(NodeRole.Follower);

    h.detach();

    for (let i = 0; i < WEDGED_UNRESPONSIVE_TICKS - 1; i += 1) {
      await election.tickOnce();
      expect(node.role).toBe(NodeRole.Follower);
    }
    await election.tickOnce();
    expect(node.role).toBe(NodeRole.Conflicted);
  });

  it('resets the count when the leader answers again, so intermittent stalls never trip it', async () => {
    const port = await freePort();
    const h = await startLeaderHarness(port);
    const { node, election } = buildElection(port);
    await election.determineRole();

    const silentTicks = WEDGED_UNRESPONSIVE_TICKS + 2;
    for (let i = 0; i < silentTicks; i += 1) {
      h.detach();
      await election.tickOnce();
      expect(node.role).toBe(NodeRole.Follower);
      h.detach = attachLeaderEndpoints(h.http, { relay: h.relay, serverVersion: 'leader-1.0.0' });
      await election.tickOnce();
      expect(node.role).toBe(NodeRole.Follower);
    }
  });

  it('names the holding process in the message when the lock can be proved', async () => {
    const port = await freePort();
    const h = await startLeaderHarness(port);
    const startedAt = lockPortToThisProcess(port);
    const probe = fakeProbe(process.pid, { state: 'S', startedAt: startedAt });
    const { node, election } = buildElection(port, { pingTimeoutMs: 200, probe });
    await election.determineRole();
    h.detach();

    for (let i = 0; i < WEDGED_UNRESPONSIVE_TICKS; i += 1) {
      await election.tickOnce();
    }
    expect(node.role).toBe(NodeRole.Conflicted);
    expect(node.conflictMessage).toContain(`pid ${process.pid}`);
    expect(node.conflictMessage).toContain('wedged-1.0.0');
    expect(node.conflictMessage).toContain(`kill ${process.pid}`);
    expect(probe.resumed).toEqual([]);
  });

  it('sends SIGCONT when the holder is suspended, and says so', async () => {
    const port = await freePort();
    const h = await startLeaderHarness(port);
    const startedAt = lockPortToThisProcess(port);
    const probe = fakeProbe(process.pid, { state: 'T', startedAt: startedAt });
    const { node, election } = buildElection(port, { pingTimeoutMs: 200, probe });
    await election.determineRole();
    h.detach();

    for (let i = 0; i < WEDGED_UNRESPONSIVE_TICKS; i += 1) {
      await election.tickOnce();
    }
    expect(node.role).toBe(NodeRole.Conflicted);
    expect(probe.resumed).toEqual([process.pid]);
    expect(node.conflictMessage).toContain('SIGCONT was just sent');
  });

  it('falls back to the anonymous message when the holder cannot be proved', async () => {
    const port = await freePort();
    const h = await startLeaderHarness(port);
    const { node, election } = buildElection(port);
    await election.determineRole();
    h.detach();
    for (let i = 0; i < WEDGED_UNRESPONSIVE_TICKS; i += 1) {
      await election.tickOnce();
    }
    expect(node.role).toBe(NodeRole.Conflicted);
    expect(node.conflictMessage).not.toContain('pid');
    expect(node.conflictMessage).toContain('Free that port');
  });

  it('recovers to follower the moment the leader answers again, and drops the diagnosis', async () => {
    const port = await freePort();
    const h = await startLeaderHarness(port);
    const startedAt = lockPortToThisProcess(port);
    const { node, election } = buildElection(port, {
      probe: fakeProbe(process.pid, { state: 'T', startedAt: startedAt }),
    });
    await election.determineRole();
    h.detach();
    for (let i = 0; i < WEDGED_UNRESPONSIVE_TICKS; i += 1) {
      await election.tickOnce();
    }
    expect(node.role).toBe(NodeRole.Conflicted);

    h.detach = attachLeaderEndpoints(h.http, { relay: h.relay, serverVersion: 'leader-1.0.0' });
    await election.tickOnce();
    expect(node.role).toBe(NodeRole.Follower);
    expect(node.conflictMessage).not.toContain('pid');
  });

  it('identifies the holder on the cold-start path too, for a server launched while the leader is already wedged', async () => {
    const port = await freePort();
    const h = await startLeaderHarness(port);
    const startedAt = lockPortToThisProcess(port);
    h.detach();
    const { node, election } = buildElection(port, {
      probe: fakeProbe(process.pid, { state: 'T', startedAt: startedAt }),
    });
    await election.determineRole();
    expect(node.role).toBe(NodeRole.Conflicted);
    expect(node.conflictMessage).toContain(`pid ${process.pid}`);
  });
});
