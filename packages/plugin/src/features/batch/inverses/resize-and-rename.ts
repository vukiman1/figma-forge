import {
  BATCH_RENAME_NODES_TOOL_NAME,
  batchRenameNodesParams,
  RESIZE_NODES_TOOL_NAME,
  resizeNodesParams,
} from '@figma-forge/core';

import { isSceneNode } from '../../nodes/scene-node.js';
import { type BatchInverse, defineInverse } from '../inverse.js';
import { liveNode } from '../live-node.js';
import {
  type BindingSnapshot,
  captureBindings,
  rebind,
  unbindAdded,
} from '../snapshot/bindings.js';
import { captureGeometry, type GeometrySnapshot, restoreGeometry } from '../snapshot/geometry.js';
import { writeIfDifferent } from '../snapshot/values.js';

interface ResizeState {
  readonly geometry: GeometrySnapshot;
  readonly bindings: BindingSnapshot;
}

const isResizable = (node: BaseNode | null): node is SceneNode =>
  isSceneNode(node) && 'resize' in node && typeof node.resize === 'function';

const geometryIds = (states: readonly ResizeState[]): string[] =>
  states.map(({ geometry }) => geometry.id);

const restoreResized = async (
  figmaCtx: typeof figma,
  states: readonly ResizeState[],
): Promise<undefined> => {
  for (const { geometry, bindings } of states) {
    // oxlint-disable-next-line no-await-in-loop -- nodes settle one at a time, as the handler resized them
    const node = await liveNode(figmaCtx, geometry.id);
    if (!isSceneNode(node)) continue;
    unbindAdded(node, bindings);
    restoreGeometry(node, geometry);
    rebind(node, bindings);
  }
  return undefined;
};

export const resizeNodesInverse: BatchInverse = defineInverse(
  RESIZE_NODES_TOOL_NAME,
  resizeNodesParams,
  {
    capture: async (figmaCtx, { nodeIds }) => {
      const nodes = await Promise.all(nodeIds.map(async id => figmaCtx.getNodeByIdAsync(id)));
      return Promise.all(
        nodes.filter(isResizable).map(async (node): Promise<ResizeState> => ({
          geometry: captureGeometry(node),
          bindings: await captureBindings(figmaCtx, node, ['width', 'height']),
        })),
      );
    },
    undo: async (figmaCtx, states) => restoreResized(figmaCtx, states),
    touches: geometryIds,
    resizes: geometryIds,
  },
);

interface NameState {
  readonly id: string;
  readonly name: string;
}

export const batchRenameInverse: BatchInverse = defineInverse(
  BATCH_RENAME_NODES_TOOL_NAME,
  batchRenameNodesParams,
  {
    capture: async (figmaCtx, { renames }) => {
      const nodes = await Promise.all(
        renames.map(async ({ nodeId }) => figmaCtx.getNodeByIdAsync(nodeId)),
      );
      return nodes.flatMap((node): NameState[] =>
        node === null ? [] : [{ id: node.id, name: node.name }],
      );
    },
    undo: async (figmaCtx, states) => {
      const nodes = await Promise.all(states.map(async ({ id }) => liveNode(figmaCtx, id)));
      states.forEach(({ name }, index) => {
        const node = nodes[index] ?? null;
        if (node !== null) writeIfDifferent(node, 'name', name);
      });
      return undefined;
    },
    touches: states => states.map(({ id }) => id),
  },
);
