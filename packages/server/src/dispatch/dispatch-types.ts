import type { Follower } from '../election/follower.js';
import type { Node } from '../election/node.js';

export interface DispatchOptions {
  maxAttempts?: number;
  retryDelayMs?: number;
  perCallTimeoutMs?: number;
  sessionId?: string;
}

export interface DispatchContext {
  node: Node;
  follower: Follower;
  log?: (message: string) => void;
}
