import {
  GET_REACTIONS_TOOL_NAME as TOOL,
  type GetReactionsResult,
  getReactionsParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { serializeReaction } from './reactions.js';

const reactionsOf = (node: BaseNode | null): readonly Reaction[] =>
  node !== null && 'reactions' in node && Array.isArray(node.reactions) ? node.reactions : [];

export const createGetReactionsHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId } = parseParams(TOOL, getReactionsParams, raw);
    const node = await figmaCtx.getNodeByIdAsync(nodeId);
    const result: GetReactionsResult = {
      nodeId,
      reactions: reactionsOf(node).map(serializeReaction),
    };
    return result;
  };
