import {
  BIND_VARIABLE_TO_NODE_TOOL_NAME,
  BIND_VARIABLE_TO_PAINT_TOOL_NAME,
  bindVariableToNodeParams,
  bindVariableToPaintParams,
} from '@figma-forge/core';

import { isSceneNode } from '../../nodes/scene-node.js';
import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { nodeForOp } from '../live-node.js';
import { captureBindings } from '../snapshot/bindings.js';
import { captureGeometry, type GeometrySnapshot } from '../snapshot/geometry.js';
import { captureProps } from '../snapshot/props.js';
import { captureText } from '../snapshot/text-capture.js';
import {
  capturePropValue,
  type NodeValueState,
  nodeValueIds,
  restoreNodeValue,
} from './node-value-state.js';

const TEXT_BINDABLE: ReadonlySet<string> = new Set([
  'characters',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'paragraphSpacing',
  'paragraphIndent',
]);

const BOX_FIELDS: ReadonlySet<string> = new Set(['width', 'height']);

const geometryOf = (node: BaseNode): GeometrySnapshot | null =>
  isSceneNode(node) ? captureGeometry(node) : null;

const captureBindTarget = async (
  figmaCtx: typeof figma,
  node: BaseNode,
  id: string,
  field: string,
): Promise<NodeValueState> => {
  const textNode = node.type === 'TEXT' && TEXT_BINDABLE.has(field) ? node : null;
  const isBox = textNode === null && BOX_FIELDS.has(field);
  const hasPlainValue = textNode === null && !isBox && field in node;
  return {
    id,
    props: hasPlainValue ? await captureProps(figmaCtx, node, [field]) : null,
    text: textNode === null ? null : await captureText(figmaCtx, textNode),
    geometry: isBox ? geometryOf(node) : null,
    bindings: await captureBindings(figmaCtx, node, [field]),
  };
};

export const bindVariableToNodeInverse: BatchInverse = defineInverse(
  BIND_VARIABLE_TO_NODE_TOOL_NAME,
  bindVariableToNodeParams,
  {
    capture: async (figmaCtx, { nodeId, field }) => {
      const node = await nodeForOp(figmaCtx, nodeId, BIND_VARIABLE_TO_NODE_TOOL_NAME);
      return captureBindTarget(figmaCtx, node, nodeId, field);
    },
    undo: async (figmaCtx, state) => restoreNodeValue(figmaCtx, state),
    touches: nodeValueIds,
    resizes: nodeValueIds,
  },
);

export const bindVariableToPaintInverse: BatchInverse = defineInverse(
  BIND_VARIABLE_TO_PAINT_TOOL_NAME,
  bindVariableToPaintParams,
  {
    capture: async (figmaCtx, { nodeId, target = 'fills' }) => {
      const node = await nodeForOp(figmaCtx, nodeId, BIND_VARIABLE_TO_PAINT_TOOL_NAME);
      if (!(target in node)) {
        throw new Error(
          `${batchTool(BIND_VARIABLE_TO_PAINT_TOOL_NAME)}: node ${nodeId} has no ${target}`,
        );
      }
      return capturePropValue(figmaCtx, node, nodeId, target);
    },
    undo: async (figmaCtx, state) => restoreNodeValue(figmaCtx, state),
    touches: nodeValueIds,
  },
);
