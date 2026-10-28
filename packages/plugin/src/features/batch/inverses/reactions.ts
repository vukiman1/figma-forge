import {
  REMOVE_REACTIONS_TOOL_NAME,
  removeReactionsParams,
  SET_REACTIONS_TOOL_NAME,
  setReactionsParams,
} from '@figma-forge/core';
import type { z } from 'zod';

import { canHaveReactions } from '../../prototype/reactions.js';
import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { liveNode, nodeForOp } from '../live-node.js';
import { same } from '../snapshot/values.js';

interface ReactionsState {
  readonly id: string;
  readonly reactions: readonly Reaction[];
}

const reactionsInverse = (tool: string, schema: z.ZodType<{ nodeId: string }>): BatchInverse =>
  defineInverse(tool, schema, {
    capture: async (figmaCtx, { nodeId }): Promise<ReactionsState> => {
      const node = await nodeForOp(figmaCtx, nodeId, tool);
      if (!canHaveReactions(node)) {
        throw new Error(`${batchTool(tool)}: node ${nodeId} cannot have reactions`);
      }
      return { id: nodeId, reactions: node.reactions };
    },
    undo: async (figmaCtx, { id, reactions }) => {
      const node = await liveNode(figmaCtx, id);
      if (canHaveReactions(node) && !same(node.reactions, reactions)) {
        await node.setReactionsAsync([...reactions]);
      }
      return undefined;
    },
    touches: ({ id }) => [id],
  });

export const setReactionsInverse: BatchInverse = reactionsInverse(
  SET_REACTIONS_TOOL_NAME,
  setReactionsParams,
);

export const removeReactionsInverse: BatchInverse = reactionsInverse(
  REMOVE_REACTIONS_TOOL_NAME,
  removeReactionsParams,
);
