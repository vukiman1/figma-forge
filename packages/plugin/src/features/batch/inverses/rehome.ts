import { isSceneNode } from '../../nodes/scene-node.js';
import { batchTool } from '../inverse.js';
import { liveNode } from '../live-node.js';
import { captureOrders, type ContainerOrder, restoreOrders } from '../snapshot/container-orders.js';
import { restoreGeometry } from '../snapshot/geometry.js';
import { capturePlacement, type Placement } from '../snapshot/order.js';
import { writeIfDifferent } from '../snapshot/values.js';

type Container = BaseNode & ChildrenMixin;

export interface Rehome {
  readonly placements: readonly Placement[];
  readonly orders: readonly ContainerOrder[];
}

const parentsOf = (nodes: readonly SceneNode[]): Container[] =>
  nodes.flatMap(node => (node.parent === null ? [] : [node.parent]));

export const captureRehome = (nodes: readonly SceneNode[], also: readonly Container[]): Rehome => {
  const orders = captureOrders([...parentsOf(nodes), ...also]);
  return { placements: nodes.map(capturePlacement), orders };
};

const putBack = (node: BaseNode | null, { geometry, name }: Placement): void => {
  if (!isSceneNode(node)) throw new Error(`node ${geometry.id} no longer exists to be put back`);
  restoreGeometry(node, geometry);
  writeIfDifferent(node, 'name', name);
};

export const undoRehome = async (figmaCtx: typeof figma, rehome: Rehome): Promise<void> => {
  await restoreOrders(figmaCtx, rehome.orders);
  const nodes = await Promise.all(
    rehome.placements.map(async ({ geometry }) => liveNode(figmaCtx, geometry.id)),
  );
  rehome.placements.forEach((placement, index) => putBack(nodes[index] ?? null, placement));
};

export const refuseVariantLeaving = (
  tool: string,
  nodes: readonly SceneNode[],
  destinationId: string | null,
): void => {
  const leaving = nodes.find(
    node => node.parent?.type === 'COMPONENT_SET' && node.parent.id !== destinationId,
  );
  if (leaving?.parent == null) return;
  throw new Error(
    `${batchTool(tool)}: ${leaving.id} is a variant of ${leaving.parent.id} — taking it out of its ` +
      'set rewrites its name and the variant properties of the set, which has no faithful inverse',
  );
};

export const parentIds = (rehome: Rehome): string[] =>
  rehome.orders.map(({ parentId }) => parentId);
