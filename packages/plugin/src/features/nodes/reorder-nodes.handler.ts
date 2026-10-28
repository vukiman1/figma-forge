import {
  type BatchNodeResult,
  REORDER_NODES_TOOL_NAME as TOOL,
  reorderNodesParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { applyEach } from './apply-each.js';
import { isSceneNode } from './scene-node.js';

export const createReorderNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeIds, index } = parseParams(TOOL, reorderNodesParams, raw);
    const affected = await applyEach(figmaCtx, nodeIds, node => {
      if (!isSceneNode(node) || node.parent === null) return false;
      node.parent.insertChild(index, node);
      return true;
    });
    const result: BatchNodeResult = { ok: true, affected };
    return result;
  };
