import { FIND_REPLACE_TEXT_TOOL_NAME, findReplaceTextParams } from '@figma-forge/core';
import type { z } from 'zod';

import { findReplacePlan } from '../../text/find-replace-text.handler.js';
import { isTextLike } from '../../text/text-like.js';
import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { joinNotes, liveNode, nodeForOp } from '../live-node.js';
import { captureText, type TextSnapshot } from '../snapshot/text-capture.js';
import { restoreText } from '../snapshot/text-restore.js';

interface TextState {
  readonly id: string;
  readonly text: TextSnapshot;
}

const ids = (states: readonly TextState[]): string[] => states.map(({ id }) => id);

const restoreOne = async (
  figmaCtx: typeof figma,
  { id, text }: TextState,
): Promise<string | undefined> => {
  const node = await liveNode(figmaCtx, id);
  return isTextLike(node) ? restoreText(figmaCtx, node, text) : undefined;
};

export const textInverse = (tool: string, schema: z.ZodType<{ nodeId: string }>): BatchInverse =>
  defineInverse(tool, schema, {
    capture: async (figmaCtx, { nodeId }) => {
      const node = await nodeForOp(figmaCtx, nodeId, tool);
      if (!isTextLike(node)) {
        throw new Error(`${batchTool(tool)}: node ${nodeId} is not a TEXT node or text on a path`);
      }
      const state: TextState = { id: nodeId, text: await captureText(figmaCtx, node) };
      return state;
    },
    undo: async (figmaCtx, state) => restoreOne(figmaCtx, state),
    touches: ({ id }) => [id],
    resizes: ({ id }) => [id],
  });

export const findReplaceInverse: BatchInverse = defineInverse(
  FIND_REPLACE_TEXT_TOOL_NAME,
  findReplaceTextParams,
  {
    capture: async (figmaCtx, params) => {
      const { matches } = await findReplacePlan(
        figmaCtx,
        params,
        batchTool(FIND_REPLACE_TEXT_TOOL_NAME),
      );
      return Promise.all(
        matches.map(async node => ({ id: node.id, text: await captureText(figmaCtx, node) })),
      );
    },
    undo: async (figmaCtx, states) => {
      const notes: unknown[] = [];
      for (const state of states) {
        // oxlint-disable-next-line no-await-in-loop -- font loads and style setters run node by node
        notes.push(await restoreOne(figmaCtx, state));
      }
      return joinNotes(notes);
    },
    touches: ids,
    resizes: ids,
  },
);
