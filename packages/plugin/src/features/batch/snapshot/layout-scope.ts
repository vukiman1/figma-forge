import { isSceneNode } from '../../nodes/scene-node.js';
import {
  captureGeometry,
  type GeometrySnapshot,
  isDerivedBox,
  restoreGeometry,
} from './geometry.js';
import { isInFlow, readField, same } from './values.js';

export type LayoutScope = readonly GeometrySnapshot[];

const INSTANCE_SUBLAYER_PREFIX = 'I';
const SETTLING_PASSES = 2;

const isAutoLayout = (node: BaseNode | null): boolean => {
  const mode = node === null ? undefined : readField(node, 'layoutMode');
  return typeof mode === 'string' && mode !== 'NONE';
};

const ownsBox = (node: SceneNode): boolean =>
  !isInFlow(node) &&
  !isDerivedBox(node) &&
  !node.id.startsWith(INSTANCE_SUBLAYER_PREFIX) &&
  'relativeTransform' in node;

const layoutTopOf = (node: SceneNode): SceneNode => {
  let top = node;
  while (isAutoLayout(top.parent) && isSceneNode(top.parent)) top = top.parent;
  return top;
};

const regionOf = (root: SceneNode): SceneNode[] =>
  'findAll' in root ? [root, ...root.findAll(() => true)] : [root];

export const captureLayoutScope = async (
  figmaCtx: typeof figma,
  ids: readonly string[],
): Promise<LayoutScope> => {
  const nodes = await Promise.all(ids.map(async id => figmaCtx.getNodeByIdAsync(id)));
  const roots = new Map(
    nodes.filter(isSceneNode).map(node => [layoutTopOf(node).id, layoutTopOf(node)]),
  );
  const boxes = new Map<string, GeometrySnapshot>();
  for (const node of [...roots.values()].flatMap(regionOf)) {
    if (!boxes.has(node.id) && ownsBox(node)) boxes.set(node.id, captureGeometry(node));
  }
  return [...boxes.values()];
};

const hasDrifted = (node: SceneNode, snapshot: GeometrySnapshot): boolean =>
  node.width !== snapshot.width ||
  node.height !== snapshot.height ||
  !same(node.relativeTransform, snapshot.transform);

export const restoreLayoutDrift = async (
  figmaCtx: typeof figma,
  scope: LayoutScope,
): Promise<void> => {
  if (scope.length === 0) return;
  const nodes = await Promise.all(
    scope.map(async snapshot => figmaCtx.getNodeByIdAsync(snapshot.id)),
  );
  for (let pass = 0; pass < SETTLING_PASSES; pass += 1) {
    scope.forEach((snapshot, index) => {
      const node = nodes[index] ?? null;
      if (isSceneNode(node) && !node.removed && hasDrifted(node, snapshot))
        restoreGeometry(node, snapshot);
    });
  }
};
