import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { leaderLockPath, writeLeaderLock } from '../../src/election/leader-lock.js';
import type { ProcessProbe, ProcessSnapshot } from '../../src/election/process-probe.js';

const LOCK_PORT_FLOOR = 20_000;
const PORTS_PER_SLOT = 2_000;
const PID_SPREAD = 20;
const PORTS_PER_PID = 100;

export const EPHEMERAL_PORT_FLOOR = 32_768;

export enum LockPortSlot {
  LeaderLock = 0,
  PortHolder = 1,
}

export interface LockPorts {
  readonly next: () => number;
  readonly writeLock: (port: number) => void;
  readonly writeRawLock: (port: number, body: string) => void;
  readonly track: (port: number) => void;
  readonly cleanup: () => void;
}

export const createLockPorts = (slot: LockPortSlot): LockPorts => {
  let nextPort =
    LOCK_PORT_FLOOR + slot * PORTS_PER_SLOT + (process.pid % PID_SPREAD) * PORTS_PER_PID;
  const written: number[] = [];
  return {
    next: () => (nextPort += 1),
    track: port => written.push(port),
    writeLock: port => {
      written.push(port);
      writeLeaderLock({ port, buildId: 42, serverVersion: '9.9.9' });
    },
    writeRawLock: (port, body) => {
      written.push(port);
      mkdirSync(dirname(leaderLockPath(port)), { recursive: true });
      writeFileSync(leaderLockPath(port), body);
    },
    cleanup: () => {
      for (const port of written) rmSync(leaderLockPath(port), { force: true });
      written.length = 0;
    },
  };
};

export const fakeProbe = (
  pid: number,
  live: ProcessSnapshot | undefined,
  onResume?: (pid: number) => boolean,
): ProcessProbe & { resumed: number[] } => {
  const resumed: number[] = [];
  return {
    resumed,
    inspect: candidate => (candidate === pid ? live : undefined),
    resume: candidate => {
      resumed.push(candidate);
      return onResume?.(candidate) ?? true;
    },
  };
};

export const uptimeStart = (): number => Date.now() - Math.round(process.uptime() * 1_000);

const REAL_PLATFORM = process.platform;

export const asPlatform = (value: NodeJS.Platform): void => {
  Object.defineProperty(process, 'platform', { value, configurable: true });
};

export const restorePlatform = (): void => asPlatform(REAL_PLATFORM);
