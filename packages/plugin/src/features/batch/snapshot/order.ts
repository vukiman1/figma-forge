import { isSceneNode } from '../../nodes/scene-node.js';
import { captureGeometry, type GeometrySnapshot } from './geometry.js';
import { nodeOrThrow } from './values.js';

export interface Placement {
  readonly parentId: string;
  readonly geometry: GeometrySnapshot;
  readonly name: string;
}

const RESTORE_ORDER = 'restore order';

export const capturePlacement = (node: SceneNode): Placement => {
  if (node.parent === null) throw new Error(`node ${node.id} has no parent`);
  return { parentId: node.parent.id, geometry: captureGeometry(node), name: node.name };
};

export const captureOrder = (parent: BaseNode & ChildrenMixin): string[] =>
  parent.children.map(child => child.id);

type SceneContainer = (SceneNode & ChildrenMixin) | PageNode;

const isSceneContainer = (node: BaseNode): node is SceneContainer =>
  node.type === 'PAGE' || (isSceneNode(node) && 'insertChild' in node);

export const restoreOrder = async (
  figmaCtx: typeof figma,
  parentId: string,
  ids: readonly string[],
): Promise<void> => {
  const parent = await nodeOrThrow(figmaCtx, parentId, RESTORE_ORDER);
  if (!isSceneContainer(parent)) {
    throw new Error(`${RESTORE_ORDER}: node ${parentId} has no children`);
  }
  const nodes = await Promise.all(ids.map(async id => nodeOrThrow(figmaCtx, id, RESTORE_ORDER)));
  nodes.forEach((node, position) => {
    if (parent.children[position]?.id === node.id || !isSceneNode(node)) return;
    parent.insertChild(position, node);
  });
};
