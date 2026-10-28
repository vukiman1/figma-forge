import {
  type BatchNodeResult,
  DELETE_NODES_TOOL_NAME as TOOL,
  deleteNodesParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { applyEach } from './apply-each.js';

const removedOrKept = (node: BaseNode): boolean => {
  if (!('remove' in node)) return false;
  try {
    node.remove();
    return true;
  } catch {
    return false;
  }
};

export const createDeleteNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeIds } = parseParams(TOOL, deleteNodesParams, raw);
    const result: BatchNodeResult = {
      ok: true,
      affected: await applyEach(figmaCtx, nodeIds, removedOrKept),
    };
    return result;
  };
