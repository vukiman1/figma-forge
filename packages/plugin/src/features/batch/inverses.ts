import type { BatchInverse } from './inverse.js';
import { NODE_INVERSES } from './inverses/node-inverses.js';
import { RESOURCE_INVERSES } from './inverses/resource-inverses.js';

export const INVERSES: Readonly<Record<string, BatchInverse>> = {
  ...NODE_INVERSES,
  ...RESOURCE_INVERSES,
};

export const BATCHABLE_TOOLS: readonly string[] = Object.keys(INVERSES);
