import {
  type MutateResult,
  RENAME_NODE_TOOL_NAME as TOOL,
  renameNodeParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { requireNode } from '../require-node.js';

export const createRenameNodeHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, name } = parseParams(TOOL, renameNodeParams, raw);
    const node = await requireNode(figmaCtx, TOOL, nodeId);
    node.name = name;
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
