import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import { analyzeProject } from '../profile/project-profile.js';
import { isUtilityFirst } from '../profile/styling-system.js';
import { loadProjectTokens } from './load.js';
import { buildTokenValueIndex, type TokenValueIndex } from './token-value-index.js';

interface CachedIndex {
  readonly index: TokenValueIndex;
  readonly utilityFirst: boolean;
  readonly fileMtimes: ReadonlyMap<string, number>;
  readonly builtAt: number;
}

export interface LoadedTokenValueIndex {
  readonly index: TokenValueIndex;
  readonly utilityFirst: boolean;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CachedIndex>();

const currentMtime = async (path: string): Promise<number | null> => {
  try {
    return (await stat(path)).mtimeMs;
  } catch {
    return null;
  }
};

const mtimesUnchanged = async (fileMtimes: ReadonlyMap<string, number>): Promise<boolean> => {
  const checks = await Promise.all(
    [...fileMtimes].map(async ([path, expected]) => (await currentMtime(path)) === expected),
  );
  return checks.every(Boolean);
};

const cachedIndex = async (rootDir: string, now: number): Promise<LoadedTokenValueIndex | null> => {
  const hit = cache.get(rootDir);
  if (hit === undefined || now - hit.builtAt >= CACHE_TTL_MS) return null;
  if (!(await mtimesUnchanged(hit.fileMtimes))) return null;
  return { index: hit.index, utilityFirst: hit.utilityFirst };
};

const collectMtimes = async (
  rootDir: string,
  files: readonly string[],
): Promise<ReadonlyMap<string, number>> => {
  const entries = await Promise.all(
    files.map(
      async file => [join(rootDir, file), await currentMtime(join(rootDir, file))] as const,
    ),
  );
  return new Map(entries.filter((entry): entry is readonly [string, number] => entry[1] !== null));
};

const buildIndex = async (rootDir: string, now: number): Promise<LoadedTokenValueIndex> => {
  const profile = await analyzeProject(rootDir);
  const loaded = await loadProjectTokens(rootDir, profile, undefined);
  const result = {
    index: buildTokenValueIndex(loaded.tokens),
    utilityFirst: isUtilityFirst(profile.styling.system),
  };
  const fileMtimes = await collectMtimes(rootDir, loaded.files);
  cache.set(rootDir, { ...result, fileMtimes, builtAt: now });
  return result;
};

export const loadTokenValueIndex = async (rootDir: string): Promise<LoadedTokenValueIndex> => {
  const now = Date.now();
  const hit = await cachedIndex(rootDir, now);
  if (hit !== null) return hit;
  try {
    return await buildIndex(rootDir, now);
  } catch {
    return { index: new Map(), utilityFirst: false };
  }
};
