import { rmSync } from 'node:fs';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { Election } from '../../src/election/election.js';
import { Follower } from '../../src/election/follower.js';
import { attachLeaderEndpoints } from '../../src/election/leader-endpoints.js';
import { leaderLockPath, readLeaderLock, writeLeaderLock } from '../../src/election/leader-lock.js';
import { NodeRole } from '../../src/election/node-role.js';
import { Node } from '../../src/election/node.js';
import type { ProcessProbe } from '../../src/election/process-probe.js';
import type { Relay } from '../../src/relay/relay.js';

export interface LeaderHarness {
  node: Node;
  http: HttpServer;
  relay: Relay;
  port: number;
  detach: () => void;
}

export interface ElectionUnderTest {
  node: Node;
  election: Election;
  follower: Follower;
}

export interface ElectionSetup {
  pingTimeoutMs?: number;
  buildId?: number;
  log?: (msg: string) => void;
  probe?: ProcessProbe;
}

const NEVER_TICKS_MS = 1_000_000;

const harnesses: LeaderHarness[] = [];
const nodes: Node[] = [];
const elections: Election[] = [];
const squatters: HttpServer[] = [];
const lockedPorts: number[] = [];

const listen = (http: HttpServer, port: number): Promise<void> =>
  new Promise<void>(resolve => http.listen(port, '127.0.0.1', () => resolve()));

const close = (http: HttpServer): Promise<void> =>
  new Promise<void>(resolve => http.close(() => resolve()));

const stopHarness = async (harness: LeaderHarness): Promise<void> => {
  harness.detach();
  await harness.relay.stop();
  harness.http.closeAllConnections();
  await close(harness.http);
};

export const stopLeaderHarness = async (harness: LeaderHarness): Promise<void> => {
  harnesses.splice(harnesses.indexOf(harness), 1);
  await stopHarness(harness);
};

export const cleanupElections = async (): Promise<void> => {
  for (const election of elections) election.stop();
  elections.length = 0;
  await Promise.all(nodes.map(node => node.stop()));
  nodes.length = 0;
  await Promise.all(harnesses.map(stopHarness));
  harnesses.length = 0;
  await Promise.all(squatters.filter(http => http.listening).map(close));
  squatters.length = 0;
  for (const port of lockedPorts) rmSync(leaderLockPath(port), { force: true });
  lockedPorts.length = 0;
};

export const freePort = async (): Promise<number> => {
  const http = createServer();
  await listen(http, 0);
  const { port } = http.address() as AddressInfo;
  await close(http);
  return port;
};

export const squatPort = async (port: number): Promise<() => Promise<void>> => {
  const http = createServer();
  await listen(http, port);
  squatters.push(http);
  return () => close(http);
};

export const trackNode = (node: Node): Node => {
  nodes.push(node);
  return node;
};

export const trackElection = (election: Election): Election => {
  elections.push(election);
  return election;
};

export const startLeaderHarness = async (port: number): Promise<LeaderHarness> => {
  const node = new Node({ serverVersion: 'leader-1.0.0', port });
  const leader = await node.becomeLeader();
  const detach = attachLeaderEndpoints(leader.http, {
    relay: leader.relay,
    serverVersion: 'leader-1.0.0',
  });
  const harness: LeaderHarness = { node, ...leader, detach };
  harnesses.push(harness);
  return harness;
};

export const buildElection = (port: number, setup: ElectionSetup = {}): ElectionUnderTest => {
  const node = trackNode(new Node({ serverVersion: 'challenger-1.0.0', port }));
  const follower = new Follower({
    leaderUrl: `http://127.0.0.1:${port}`,
    pingTimeoutMs: setup.pingTimeoutMs ?? 200,
  });
  const election = trackElection(
    new Election({
      node,
      follower,
      buildId: setup.buildId ?? 0,
      tickIntervalMs: NEVER_TICKS_MS,
      ...(setup.log === undefined ? {} : { log: setup.log }),
      ...(setup.probe === undefined ? {} : { probe: setup.probe }),
    }),
  );
  return { node, election, follower };
};

export const startLeaderWithElection = async (
  port: number,
  buildId: number,
): Promise<{ node: Node; election: Election }> => {
  const { node, election } = buildElection(port, { buildId });
  await election.determineRole();
  const leader = node.getLeader();
  if (node.role !== NodeRole.Leader || leader === null) throw new Error('expected a leader');
  attachLeaderEndpoints(leader.http, {
    relay: leader.relay,
    serverVersion: 'leader-1.0.0',
    buildId,
    onAbdicate: () => election.yieldLeadership(),
    abdicateQuietWindowMs: 0,
  });
  return { node, election };
};

export const lockPortToThisProcess = (port: number): number => {
  lockedPorts.push(port);
  writeLeaderLock({ port, buildId: 7, serverVersion: 'wedged-1.0.0' });
  return readLeaderLock(port)?.processStartedAt ?? 0;
};
