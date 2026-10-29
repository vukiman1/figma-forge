import type { ActivityEntry } from '../relay/state.js';

const SLOW_CALL_MS = 2000;

export const isEntryExpandable = (entry: ActivityEntry): boolean =>
  entry.request !== undefined || entry.payload !== undefined || entry.error !== undefined;

export const durationTone = (durationMs: number | undefined): string =>
  durationMs !== undefined && durationMs > SLOW_CALL_MS ? 'text-warning' : 'text-faint';

export const formatDuration = (durationMs: number | undefined): string =>
  durationMs === undefined ? '' : `${durationMs}ms`;
