import {
  OUTLINE_STROKE_TOOL_NAME,
  outlineStrokeParams,
  SET_VECTOR_TOOL_NAME,
  setVectorParams,
} from '@figma-forge/core';

import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { liveNode, nodeForOp } from '../live-node.js';
import { removeLeftover } from '../op-result.js';
import { restoreWidthProfile } from './width-profile.js';

interface VectorState {
  readonly id: string;
  readonly network: VectorNetwork;
  readonly widths: VariableWidthStrokeProperties | null;
}

interface OutlineState {
  readonly parentId: string | null;
}

const captureVector = async (figmaCtx: typeof figma, id: string): Promise<VectorState> => {
  const node = await nodeForOp(figmaCtx, id, SET_VECTOR_TOOL_NAME);
  if (node.type !== 'VECTOR') {
    throw new Error(`${batchTool(SET_VECTOR_TOOL_NAME)}: node ${id} is not a VECTOR`);
  }
  return { id, network: node.vectorNetwork, widths: node.variableWidthStrokeProperties ?? null };
};

const restoreVector = async (
  figmaCtx: typeof figma,
  { id, network, widths }: VectorState,
): Promise<undefined> => {
  const node = await liveNode(figmaCtx, id);
  if (node?.type !== 'VECTOR') return undefined;
  await node.setVectorNetworkAsync(network);
  if (widths !== null) restoreWidthProfile(node, widths);
  return undefined;
};

export const setVectorInverse: BatchInverse = defineInverse(SET_VECTOR_TOOL_NAME, setVectorParams, {
  capture: async (figmaCtx, { nodeId }) => captureVector(figmaCtx, nodeId),
  undo: async (figmaCtx, state) => restoreVector(figmaCtx, state),
  touches: ({ id }) => [id],
  resizes: ({ id }) => [id],
});

const captureOutline = async (figmaCtx: typeof figma, id: string): Promise<OutlineState> => {
  const node = await nodeForOp(figmaCtx, id, OUTLINE_STROKE_TOOL_NAME);
  if (!('outlineStroke' in node)) {
    throw new Error(`${batchTool(OUTLINE_STROKE_TOOL_NAME)}: node ${id} has no stroke`);
  }
  return { parentId: node.parent?.id ?? null };
};

export const outlineStrokeInverse: BatchInverse = defineInverse(
  OUTLINE_STROKE_TOOL_NAME,
  outlineStrokeParams,
  {
    capture: async (figmaCtx, { nodeId }) => captureOutline(figmaCtx, nodeId),
    undo: async (figmaCtx, _state, result) => {
      await removeLeftover(figmaCtx, result, true);
      return undefined;
    },
    resizes: ({ parentId }) => (parentId === null ? [] : [parentId]),
  },
);
