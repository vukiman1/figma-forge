import {
  type BatchNodeResult,
  UNGROUP_NODES_TOOL_NAME as TOOL,
  ungroupNodesParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';

const isGroup = (node: BaseNode | null): node is GroupNode | TransformGroupNode =>
  node?.type === 'GROUP' || node?.type === 'TRANSFORM_GROUP';

export const createUngroupNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeIds } = parseParams(TOOL, ungroupNodesParams, raw);
    const nodes = await Promise.all(nodeIds.map(async id => figmaCtx.getNodeByIdAsync(id)));
    const affected = nodes
      .filter(isGroup)
      .flatMap(group => figmaCtx.ungroup(group).map(child => child.id));
    const result: BatchNodeResult = { ok: true, affected };
    return result;
  };
