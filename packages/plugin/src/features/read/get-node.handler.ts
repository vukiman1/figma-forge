import {
  GET_NODE_TOOL_NAME as TOOL,
  getNodeParams,
  type GetNodeResult,
  type SerializedNode,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { resultCharBudget, serializeTrees, treeTooLargeError } from '../../serializer.js';
import { isSceneNode } from '../nodes/scene-node.js';
import { parseParams } from '../parse-params.js';

const serializeWhole = async (node: SceneNode): Promise<SerializedNode | null> => {
  const run = await serializeTrees([node], resultCharBudget());
  if (!run.complete) throw treeTooLargeError(TOOL, run.total);
  return run.nodes[0] ?? null;
};

export const createGetNodeHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId } = parseParams(TOOL, getNodeParams, raw);
    const node = await figmaCtx.getNodeByIdAsync(nodeId);
    const result: GetNodeResult = { node: isSceneNode(node) ? await serializeWhole(node) : null };
    return result;
  };
