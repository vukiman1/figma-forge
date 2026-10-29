import type { MotionCoverage } from '@figma-forge/core';

import { costOf, NODE_TOKEN_BUDGET, PENDING_TOKEN_RESERVE } from './budget.js';

export const pendingCoverage = (
  pending: readonly string[],
  spent: number,
): Pick<MotionCoverage, 'pendingNodeIds' | 'pendingOmitted'> => {
  let room = NODE_TOKEN_BUDGET - spent + PENDING_TOKEN_RESERVE;
  let listed = 0;
  for (const id of pending) {
    const cost = costOf(id);
    if (cost > room) break;
    room -= cost;
    listed += 1;
  }
  return {
    ...(pending.length > 0 ? { pendingNodeIds: pending.slice(0, listed) } : {}),
    ...(listed < pending.length ? { pendingOmitted: pending.length - listed } : {}),
  };
};
