import { rmSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { leaderLockPath, readLeaderLock, writeLeaderLock } from '../../src/election/leader-lock.js';
import type { ProcessProbe } from '../../src/election/process-probe.js';
import {
  asPlatform,
  createLockPorts,
  EPHEMERAL_PORT_FLOOR,
  fakeProbe,
  LockPortSlot,
  restorePlatform,
  uptimeStart,
} from './lock-fixtures.js';

const ports = createLockPorts(LockPortSlot.LeaderLock);

afterEach(() => {
  ports.cleanup();
  restorePlatform();
});

describe('leader lock', () => {
  it('round-trips this process as the port holder, with its own start time rather than now', () => {
    const port = ports.next();
    ports.writeLock(port);
    const lock = readLeaderLock(port);
    expect(lock).toMatchObject({ pid: process.pid, port, buildId: 42, serverVersion: '9.9.9' });
    expect(Math.abs((lock?.processStartedAt ?? 0) - uptimeStart())).toBeLessThan(2_000);
  });

  it('records the start time from the probe the reader compares against, so sleep or an NTP step cannot drift them apart', () => {
    const port = ports.next();
    ports.track(port);
    const probe = fakeProbe(process.pid, { state: 'S', startedAt: 1_600_000_000_123 });
    writeLeaderLock({ port, buildId: 1, serverVersion: 'x' }, probe);
    expect(readLeaderLock(port)?.processStartedAt).toBe(1_600_000_000_123);
  });

  it('falls back to the uptime clock only where the process table cannot be read', () => {
    const port = ports.next();
    ports.track(port);
    const blind: ProcessProbe = { inspect: () => undefined, resume: () => false };
    writeLeaderLock({ port, buildId: 1, serverVersion: 'x' }, blind);
    expect(Math.abs((readLeaderLock(port)?.processStartedAt ?? 0) - uptimeStart())).toBeLessThan(
      2_000,
    );
  });

  it('keys test notes below every platform ephemeral range, so notes keyed by freePort() never collide across workers', () => {
    for (let i = 0; i < 50; i += 1) expect(ports.next()).toBeLessThan(EPHEMERAL_PORT_FLOOR);
  });

  it('is undefined when there is no lock for that port, even after a crashed run left one', () => {
    const port = ports.next();
    rmSync(leaderLockPath(port), { force: true });
    expect(readLeaderLock(port)).toBeUndefined();
  });

  it.each([
    ['malformed json', '{not json'],
    ['not an object', '"a string"'],
    ['missing pid', JSON.stringify({ port: 1, serverVersion: 'x', processStartedAt: 1 })],
    ['non-integer pid', JSON.stringify({ pid: 1.5, serverVersion: 'x', processStartedAt: 1 })],
    ['zero pid', JSON.stringify({ pid: 0, serverVersion: 'x', processStartedAt: 1 })],
    ['no start time', JSON.stringify({ pid: 10, serverVersion: 'x' })],
  ])('rejects a lock with %s', (_label, body) => {
    const port = ports.next();
    ports.writeRawLock(port, body.replace('"port":1', `"port":${port}`));
    expect(readLeaderLock(port)).toBeUndefined();
  });

  it("rejects a lock whose port isn't the one being asked about", () => {
    const port = ports.next();
    ports.writeRawLock(
      port,
      JSON.stringify({ pid: 10, port: port + 1, serverVersion: 'x', processStartedAt: 1 }),
    );
    expect(readLeaderLock(port)).toBeUndefined();
  });

  it('still writes a usable note on Windows, falling back to the uptime clock', () => {
    asPlatform('win32');
    const port = ports.next();
    ports.track(port);
    writeLeaderLock({ port, buildId: 3, serverVersion: 'win' });
    const lock = readLeaderLock(port);
    expect(lock?.pid).toBe(process.pid);
    expect(Math.abs((lock?.processStartedAt ?? 0) - uptimeStart())).toBeLessThan(2_000);
  });
});
