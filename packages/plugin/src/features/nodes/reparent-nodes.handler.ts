import {
  type BatchNodeResult,
  REPARENT_NODES_TOOL_NAME as TOOL,
  reparentNodesParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { applyEach } from './apply-each.js';
import { isSceneNode } from './scene-node.js';

type Container = BaseNode & ChildrenMixin;

const requireContainer = async (figmaCtx: typeof figma, parentId: string): Promise<Container> => {
  const parent = await figmaCtx.getNodeByIdAsync(parentId);
  if (parent !== null && parent.type !== 'DOCUMENT' && 'appendChild' in parent) return parent;
  throw new Error(`${TOOL}: parent ${parentId} not found or cannot contain children`);
};

export const createReparentNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeIds, newParentId, index } = parseParams(TOOL, reparentNodesParams, raw);
    const parent = await requireContainer(figmaCtx, newParentId);
    const affected = await applyEach(figmaCtx, nodeIds, node => {
      if (!isSceneNode(node)) return false;
      if (index === undefined) parent.appendChild(node);
      else parent.insertChild(index, node);
      return true;
    });
    const result: BatchNodeResult = { ok: true, affected };
    return result;
  };
