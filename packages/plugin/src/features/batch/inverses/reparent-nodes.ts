import { REPARENT_NODES_TOOL_NAME, reparentNodesParams } from '@figma-forge/core';

import { isSceneNode } from '../../nodes/scene-node.js';
import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { nodeForOp } from '../live-node.js';
import {
  captureRehome,
  parentIds,
  refuseVariantLeaving,
  type Rehome,
  undoRehome,
} from './rehome.js';

type Container = BaseNode & ChildrenMixin;

const requireDestination = async (figmaCtx: typeof figma, id: string): Promise<Container> => {
  const destination = await nodeForOp(figmaCtx, id, REPARENT_NODES_TOOL_NAME);
  if (destination.type === 'DOCUMENT' || !('appendChild' in destination)) {
    throw new Error(`${batchTool(REPARENT_NODES_TOOL_NAME)}: ${id} cannot contain children`);
  }
  return destination;
};

const isAttached = (node: BaseNode | null): node is SceneNode =>
  isSceneNode(node) && node.parent !== null;

const rehomedIds = (rehome: Rehome): string[] => [
  ...parentIds(rehome),
  ...rehome.placements.map(({ geometry }) => geometry.id),
];

export const reparentNodesInverse: BatchInverse = defineInverse(
  REPARENT_NODES_TOOL_NAME,
  reparentNodesParams,
  {
    capture: async (figmaCtx, { nodeIds, newParentId }) => {
      const destination = await requireDestination(figmaCtx, newParentId);
      const resolved = await Promise.all(nodeIds.map(async id => figmaCtx.getNodeByIdAsync(id)));
      const nodes = resolved.filter(isAttached);
      refuseVariantLeaving(REPARENT_NODES_TOOL_NAME, nodes, newParentId);
      return captureRehome(nodes, [destination]);
    },
    undo: async (figmaCtx, rehome) => {
      await undoRehome(figmaCtx, rehome);
      return undefined;
    },
    resizes: rehomedIds,
    moves: async (_figmaCtx, { nodeIds, newParentId }) => ({
      nodeIds,
      destinationId: newParentId,
    }),
  },
);
