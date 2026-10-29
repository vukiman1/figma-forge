import {
  BATCH_RENAME_NODES_TOOL_NAME as TOOL,
  type BatchNodeResult,
  batchRenameNodesParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';

export const createBatchRenameNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { renames } = parseParams(TOOL, batchRenameNodesParams, raw);
    const nodes = await Promise.all(
      renames.map(async ({ nodeId }) => figmaCtx.getNodeByIdAsync(nodeId)),
    );
    const affected = renames.filter(({ name }, index) => {
      const node = nodes[index] ?? null;
      if (node === null) return false;
      node.name = name;
      return true;
    });
    const result: BatchNodeResult = { ok: true, affected: affected.map(({ nodeId }) => nodeId) };
    return result;
  };
