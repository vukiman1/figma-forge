import {
  type CreateResult,
  GROUP_NODES_TOOL_NAME as TOOL,
  groupNodesParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { isSceneNode } from './scene-node.js';

export const createGroupNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeIds, name } = parseParams(TOOL, groupNodesParams, raw);
    const resolved = await Promise.all(nodeIds.map(async id => figmaCtx.getNodeByIdAsync(id)));
    const nodes = resolved.filter(isSceneNode);
    const parent = nodes[0]?.parent ?? null;
    if (nodes.length === 0) throw new Error(`${TOOL}: no valid nodes to group`);
    if (parent === null || !('appendChild' in parent)) {
      throw new Error(`${TOOL}: nodes have no groupable parent`);
    }
    const group = figmaCtx.group(nodes, parent);
    if (name !== undefined) group.name = name;
    const result: CreateResult = { ok: true, nodeId: group.id, name: group.name, type: group.type };
    return result;
  };
