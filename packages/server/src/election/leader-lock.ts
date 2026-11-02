import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { z } from 'zod';

import { parseJson } from '../parse-json.js';
import { osProcessProbe, type ProcessProbe } from './process-probe.js';

const LOCK_DIR_NAME = 'figma-forge';
const OWNER_ONLY_MODE = 0o600;
const MS_PER_SECOND = 1_000;

const LeaderLockSchema = z.object({
  pid: z.number().int().positive(),
  port: z.number(),
  buildId: z.number().catch(0),
  serverVersion: z.string(),
  processStartedAt: z.number(),
});

export type LeaderLock = z.infer<typeof LeaderLockSchema>;

export interface LeaderLockInput {
  readonly port: number;
  readonly buildId: number;
  readonly serverVersion: string;
}

const lockDir = (): string => join(tmpdir(), LOCK_DIR_NAME);

export const leaderLockPath = (port: number): string => join(lockDir(), `leader-${port}.json`);

const processStartedAt = (probe: ProcessProbe): number =>
  probe.inspect(process.pid)?.startedAt ??
  Date.now() - Math.round(process.uptime() * MS_PER_SECOND);

export const writeLeaderLock = (
  input: LeaderLockInput,
  probe: ProcessProbe = osProcessProbe,
): boolean => {
  const lock: LeaderLock = {
    pid: process.pid,
    port: input.port,
    buildId: input.buildId,
    serverVersion: input.serverVersion,
    processStartedAt: processStartedAt(probe),
  };
  try {
    mkdirSync(lockDir(), { recursive: true });
    writeFileSync(leaderLockPath(input.port), JSON.stringify(lock), { mode: OWNER_ONLY_MODE });
    return true;
  } catch {
    return false;
  }
};

const readLockFile = (port: number): string | undefined => {
  try {
    return readFileSync(leaderLockPath(port), 'utf8');
  } catch {
    return undefined;
  }
};

export const readLeaderLock = (port: number): LeaderLock | undefined => {
  const raw = readLockFile(port);
  if (raw === undefined) return undefined;
  const parsed = LeaderLockSchema.safeParse(parseJson(raw));
  return parsed.success && parsed.data.port === port ? parsed.data : undefined;
};
