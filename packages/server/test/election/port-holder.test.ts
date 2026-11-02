import { rmSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { leaderLockPath, readLeaderLock, writeLeaderLock } from '../../src/election/leader-lock.js';
import {
  identifyPortHolder,
  PID_IDENTITY_TOLERANCE_MS,
  type PortHolder,
  resumeStoppedHolder,
} from '../../src/election/port-holder.js';
import { osProcessProbe } from '../../src/election/process-probe.js';
import {
  asPlatform,
  createLockPorts,
  fakeProbe,
  LockPortSlot,
  restorePlatform,
} from './lock-fixtures.js';

const ports = createLockPorts(LockPortSlot.PortHolder);

afterEach(() => {
  ports.cleanup();
  restorePlatform();
});

const lockedPort = (): { port: number; startedAt: number } => {
  const port = ports.next();
  ports.writeLock(port);
  return { port, startedAt: readLeaderLock(port)?.processStartedAt ?? 0 };
};

describe('identifyPortHolder', () => {
  it('confirms a live process whose start time matches the lock', () => {
    const { port, startedAt } = lockedPort();
    const probe = fakeProbe(process.pid, { state: 'S', startedAt });
    expect(identifyPortHolder(port, probe)).toEqual({
      pid: process.pid,
      buildId: 42,
      serverVersion: '9.9.9',
      stopped: false,
      resumed: false,
    });
  });

  it('refuses a recycled pid whose start time differs, rather than name an innocent process to kill', () => {
    const { port, startedAt } = lockedPort();
    const probe = fakeProbe(process.pid, {
      state: 'S',
      startedAt: startedAt + PID_IDENTITY_TOLERANCE_MS + 1,
    });
    expect(identifyPortHolder(port, probe)).toBeUndefined();
  });

  it('accepts a start time inside the tolerance, since ps reports whole seconds', () => {
    const { port, startedAt } = lockedPort();
    const probe = fakeProbe(process.pid, {
      state: 'S',
      startedAt: startedAt - PID_IDENTITY_TOLERANCE_MS,
    });
    expect(identifyPortHolder(port, probe)?.pid).toBe(process.pid);
  });

  it('is undefined when the pid is gone', () => {
    const { port } = lockedPort();
    expect(identifyPortHolder(port, fakeProbe(process.pid, undefined))).toBeUndefined();
  });

  it('is undefined when there is no lock at all', () => {
    const port = ports.next();
    rmSync(leaderLockPath(port), { force: true });
    const probe = fakeProbe(process.pid, { state: 'T', startedAt: Date.now() });
    expect(identifyPortHolder(port, probe)).toBeUndefined();
  });

  it.each([
    ['T', true],
    ['T+', true],
    ['S', false],
    ['R', false],
    ['S+', false],
  ])('reads process state %s as stopped=%s', (state, stopped) => {
    const { port, startedAt } = lockedPort();
    const probe = fakeProbe(process.pid, { state, startedAt });
    expect(identifyPortHolder(port, probe)?.stopped).toBe(stopped);
  });

  it('never identifies a holder on Windows, so it can never name a pid to kill', () => {
    asPlatform('win32');
    const port = ports.next();
    ports.track(port);
    writeLeaderLock({ port, buildId: 3, serverVersion: 'win' });
    expect(identifyPortHolder(port)).toBeUndefined();
  });

  it.skipIf(process.platform === 'win32')(
    'identifies this very process through the real probe, with the exact start time the writer recorded',
    () => {
      const { port } = lockedPort();
      const holder = identifyPortHolder(port);
      expect(holder?.pid).toBe(process.pid);
      expect(holder?.stopped).toBe(false);
      expect(readLeaderLock(port)?.processStartedAt).toBe(
        osProcessProbe.inspect(process.pid)?.startedAt,
      );
    },
  );
});

describe('resumeStoppedHolder', () => {
  const holder = (over: Partial<PortHolder> = {}): PortHolder => ({
    pid: 4321,
    buildId: 1,
    serverVersion: '1.0.0',
    stopped: false,
    resumed: false,
    ...over,
  });

  it('signals only a stopped holder', () => {
    const probe = fakeProbe(4321, undefined);
    expect(resumeStoppedHolder(holder({ stopped: false }), probe).resumed).toBe(false);
    expect(probe.resumed).toEqual([]);
  });

  it('sends SIGCONT to a stopped holder and records that it went out', () => {
    const probe = fakeProbe(4321, undefined);
    expect(resumeStoppedHolder(holder({ stopped: true }), probe).resumed).toBe(true);
    expect(probe.resumed).toEqual([4321]);
  });

  it('records a failed signal as not resumed', () => {
    const probe = fakeProbe(4321, undefined, () => false);
    expect(resumeStoppedHolder(holder({ stopped: true }), probe).resumed).toBe(false);
  });
});
