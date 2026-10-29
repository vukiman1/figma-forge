import {
  type MutateResult,
  SET_REACTIONS_TOOL_NAME as TOOL,
  setReactionsParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireReactionHost, toFigmaReaction } from './reactions.js';

export const createSetReactionsHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, reactions } = parseParams(TOOL, setReactionsParams, raw);
    const node = await requireReactionHost(figmaCtx, TOOL, nodeId);
    await node.setReactionsAsync(reactions.map(toFigmaReaction));
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
