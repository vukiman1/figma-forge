import {
  type MutateResult,
  REMOVE_REACTIONS_TOOL_NAME as TOOL,
  removeReactionsParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireReactionHost } from './reactions.js';

export const createRemoveReactionsHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId } = parseParams(TOOL, removeReactionsParams, raw);
    const node = await requireReactionHost(figmaCtx, TOOL, nodeId);
    await node.setReactionsAsync([]);
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
