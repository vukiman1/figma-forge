import { captureOrder, restoreOrder } from './order.js';

type Container = BaseNode & ChildrenMixin;

export interface ContainerOrder {
  readonly parentId: string;
  readonly order: readonly string[];
}

export const captureOrders = (containers: readonly Container[]): ContainerOrder[] => {
  const unique = new Map(containers.map(container => [container.id, container]));
  return [...unique.values()].map(container => ({
    parentId: container.id,
    order: captureOrder(container),
  }));
};

export const restoreOrders = async (
  figmaCtx: typeof figma,
  orders: readonly ContainerOrder[],
): Promise<void> => {
  for (const { parentId, order } of orders) {
    // oxlint-disable-next-line no-await-in-loop -- containers are rebuilt one after another
    await restoreOrder(figmaCtx, parentId, order);
  }
};
