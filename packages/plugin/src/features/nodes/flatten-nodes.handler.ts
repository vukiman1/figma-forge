import { FLATTEN_NODES_TOOL_NAME as TOOL, flattenNodesParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { createdResult } from './new-node.js';
import { resolveSharedParent } from './shared-parent.js';

export const createFlattenNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeIds, name } = parseParams(TOOL, flattenNodesParams, raw);
    const { nodes, parent, index } = await resolveSharedParent(
      figmaCtx,
      [...new Set(nodeIds)],
      TOOL,
    );
    const vector = figmaCtx.flatten(nodes, parent, index);
    if (name !== undefined) vector.name = name;
    return createdResult(vector);
  };
