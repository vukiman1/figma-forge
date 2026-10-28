import { REORDER_NODES_TOOL_NAME, reorderNodesParams } from '@figma-forge/core';

import { type BatchInverse, defineInverse } from '../inverse.js';
import { captureOrders, type ContainerOrder, restoreOrders } from '../snapshot/container-orders.js';

interface OrderState {
  readonly ids: readonly string[];
  readonly orders: readonly ContainerOrder[];
}

const reorderableParent = (node: BaseNode | null): (BaseNode & ChildrenMixin)[] => {
  const parent = node !== null && 'parent' in node ? node.parent : null;
  return parent !== null && 'insertChild' in parent ? [parent] : [];
};

export const reorderNodesInverse: BatchInverse = defineInverse(
  REORDER_NODES_TOOL_NAME,
  reorderNodesParams,
  {
    capture: async (figmaCtx, { nodeIds }): Promise<OrderState> => {
      const nodes = await Promise.all(nodeIds.map(async id => figmaCtx.getNodeByIdAsync(id)));
      return { ids: nodeIds, orders: captureOrders(nodes.flatMap(reorderableParent)) };
    },
    undo: async (figmaCtx, { orders }) => {
      await restoreOrders(figmaCtx, orders);
      return undefined;
    },
    touches: ({ ids }) => ids,
  },
);
