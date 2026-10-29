import type { Follower } from './follower.js';
import type { Node } from './node.js';
import type { ProcessProbe } from './process-probe.js';

export const DEFAULT_TICK_INTERVAL_MS = 1_000;
export const YIELD_GRACE_MS = 5_000;
export const ABDICATION_BACKOFF_MS = 60_000;
export const WEDGED_UNRESPONSIVE_TICKS = 5;
export const RACE_RETRY_DELAY_MS = 50;

export interface ElectionOptions {
  node: Node;
  follower: Follower;
  buildId?: number;
  tickIntervalMs?: number;
  log?: (msg: string) => void;
  probe?: ProcessProbe;
}
