import { APPLY_STYLE_TO_NODE_TOOL_NAME, applyStyleToNodeParams } from '@figma-forge/core';

import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { nodeForOp } from '../live-node.js';
import { captureText } from '../snapshot/text-capture.js';
import {
  capturePropValue,
  type NodeValueState,
  nodeValueIds,
  restoreNodeValue,
} from './node-value-state.js';

const STYLE_FIELD_PROP = {
  fill: 'fills',
  stroke: 'strokes',
  effect: 'effects',
  grid: 'layoutGrids',
} as const;

const captureTextStyleTarget = async (
  figmaCtx: typeof figma,
  node: BaseNode,
  id: string,
): Promise<NodeValueState> => {
  if (node.type !== 'TEXT') {
    throw new Error(
      `${batchTool(APPLY_STYLE_TO_NODE_TOOL_NAME)}: node ${id} cannot take a text style`,
    );
  }
  return { id, props: null, text: await captureText(figmaCtx, node), geometry: null, bindings: {} };
};

export const applyStyleToNodeInverse: BatchInverse = defineInverse(
  APPLY_STYLE_TO_NODE_TOOL_NAME,
  applyStyleToNodeParams,
  {
    capture: async (figmaCtx, { nodeId, field }) => {
      const node = await nodeForOp(figmaCtx, nodeId, APPLY_STYLE_TO_NODE_TOOL_NAME);
      if (field === 'text') return captureTextStyleTarget(figmaCtx, node, nodeId);
      const prop = STYLE_FIELD_PROP[field];
      if (!(prop in node)) {
        throw new Error(
          `${batchTool(APPLY_STYLE_TO_NODE_TOOL_NAME)}: node ${nodeId} cannot take a ${field} style`,
        );
      }
      return capturePropValue(figmaCtx, node, nodeId, prop);
    },
    undo: async (figmaCtx, state) => restoreNodeValue(figmaCtx, state),
    touches: nodeValueIds,
    resizes: nodeValueIds,
  },
);
