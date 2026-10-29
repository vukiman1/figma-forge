import type { BatchNodeResult } from '@figma-forge/core';

import { applyEach } from './apply-each.js';

export const setLocked = async (
  figmaCtx: typeof figma,
  nodeIds: readonly string[],
  locked: boolean,
): Promise<BatchNodeResult> => {
  const affected = await applyEach(figmaCtx, nodeIds, node => {
    if (!('locked' in node)) return false;
    node.locked = locked;
    return true;
  });
  return { ok: true, affected };
};
