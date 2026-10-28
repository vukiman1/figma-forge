import {
  type BatchNodeResult,
  MOVE_NODES_TOOL_NAME as TOOL,
  moveNodesParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { applyEach } from './apply-each.js';

export const createMoveNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeIds, dx = 0, dy = 0 } = parseParams(TOOL, moveNodesParams, raw);
    const affected = await applyEach(figmaCtx, nodeIds, node => {
      if (!('x' in node) || !('y' in node)) return false;
      node.x += dx;
      node.y += dy;
      return true;
    });
    const result: BatchNodeResult = { ok: true, affected };
    return result;
  };
