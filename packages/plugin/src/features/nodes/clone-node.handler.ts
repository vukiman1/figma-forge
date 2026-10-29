import {
  CLONE_NODE_TOOL_NAME as TOOL,
  cloneNodeParams,
  type CreateResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';

const requireCloneable = async (figmaCtx: typeof figma, nodeId: string): Promise<SceneNode> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (
    node !== null &&
    'clone' in node &&
    typeof node.clone === 'function' &&
    node.type !== 'PAGE'
  ) {
    return node;
  }
  throw new Error(`${TOOL}: node ${nodeId} not found or cannot be cloned`);
};

export const createCloneNodeHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId } = parseParams(TOOL, cloneNodeParams, raw);
    const node = await requireCloneable(figmaCtx, nodeId);
    const copy = node.clone();
    const { parent } = node;
    if (parent !== null && 'appendChild' in parent) parent.appendChild(copy);
    else figmaCtx.currentPage.appendChild(copy);
    const result: CreateResult = { ok: true, nodeId: copy.id, name: copy.name, type: copy.type };
    return result;
  };
