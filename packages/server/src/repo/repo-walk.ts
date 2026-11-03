import { fdir } from 'fdir';
import type { Ignore } from 'ignore';

import { IGNORED_DIRS } from './ignored-dirs.js';
import { buildRepoIgnoreMatcher } from './repo-ignore.js';
import { byDepthThenPath } from './repo-path-order.js';

const DEFAULT_CAP = 5000;
const TRIM_FACTOR = 4;

export interface WalkOptions {
  extensions?: readonly string[];
  cap?: number;
}

export interface RepoWalk {
  files: string[];
  omitted: number;
}

interface WalkState {
  kept: string[];
  matched: number;
}

const normalizeExtensions = (extensions: readonly string[] | undefined): string[] | undefined =>
  extensions?.map(extension => (extension.startsWith('.') ? extension : `.${extension}`));

const matchesPath = (
  path: string,
  extensions: readonly string[] | undefined,
  matcher: Ignore,
): boolean => {
  const basename = path.slice(path.lastIndexOf('/') + 1);
  if (basename.startsWith('.')) return false;
  if (extensions !== undefined && !extensions.some(extension => basename.endsWith(extension))) {
    return false;
  }
  return !matcher.ignores(path);
};

const trimKeptFiles = (state: WalkState, cap: number): void => {
  state.kept.sort(byDepthThenPath);
  state.kept.length = cap;
};

const createPathCollector = (
  state: WalkState,
  extensions: readonly string[] | undefined,
  matcher: Ignore,
  cap: number,
): ((path: string) => boolean) => {
  const trimAt = Math.max(cap * TRIM_FACTOR, cap + 1);
  return (path: string): boolean => {
    if (!matchesPath(path, extensions, matcher)) return false;
    state.matched += 1;
    state.kept.push(path);
    if (state.kept.length >= trimAt) trimKeptFiles(state, cap);
    return false;
  };
};

const crawlRepo = async (
  rootDir: string,
  matcher: Ignore,
  extensions: readonly string[] | undefined,
  cap: number,
  state: WalkState,
): Promise<void> => {
  await new fdir()
    .withRelativePaths()
    .withPathSeparator('/')
    .exclude(directoryName => directoryName.startsWith('.') || IGNORED_DIRS.has(directoryName))
    .filter(createPathCollector(state, extensions, matcher, cap))
    .crawl(rootDir)
    .withPromise();
};

export const walkRepoFiles = async (
  rootDir: string,
  options: WalkOptions = {},
): Promise<RepoWalk> => {
  const cap = options.cap ?? DEFAULT_CAP;
  const extensions = normalizeExtensions(options.extensions);
  const matcher = await buildRepoIgnoreMatcher(rootDir);
  const state: WalkState = { kept: [], matched: 0 };
  await crawlRepo(rootDir, matcher, extensions, cap, state);
  trimKeptFiles(state, Math.min(cap, state.kept.length));
  return { files: state.kept, omitted: state.matched - state.kept.length };
};

export const truncationNote = (kind: string, omitted: number): string =>
  `file cap reached: ${omitted} further ${kind} were not read, so a missing match may simply be outside what was scanned`;
