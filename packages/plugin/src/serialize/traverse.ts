import { isSceneNode } from '../features/nodes/scene-node.js';
import { TimeSlice } from '../runtime/cooperative.js';

const isSceneNodeList = (value: unknown): value is readonly SceneNode[] => Array.isArray(value);

export const childrenOf = (node: SceneNode): readonly SceneNode[] | null => {
  if (!('children' in node)) return null;
  const children: unknown = node.children;
  return isSceneNodeList(children) ? children : null;
};

export function* walk(nodes: readonly SceneNode[]): Generator<SceneNode> {
  for (const node of nodes) {
    yield node;
    const children = childrenOf(node);
    if (children !== null) yield* walk(children);
  }
}

const pushReversed = <T>(stack: T[], items: readonly T[]): void => {
  for (const item of items.toReversed()) stack.push(item);
};

export const collectMatches = async (
  nodes: readonly SceneNode[],
  match: (node: SceneNode) => boolean,
): Promise<SceneNode[]> => {
  const matches: SceneNode[] = [];
  const stack = nodes.toReversed();
  const slice = new TimeSlice();
  for (let node = stack.pop(); node !== undefined; node = stack.pop()) {
    if (match(node)) matches.push(node);
    pushReversed(stack, childrenOf(node) ?? []);
    // oxlint-disable-next-line no-await-in-loop -- hand the thread back between slices
    if (stack.length > 0 && slice.due()) await slice.yield();
  }
  return matches;
};

export interface FlatForest {
  readonly nodes: SceneNode[];
  readonly parents: number[];
  readonly hasChildren: boolean[];
}

interface Pending {
  readonly node: SceneNode;
  readonly parent: number;
}

const ROOT_PARENT = -1;

export const flattenForest = async (roots: readonly SceneNode[]): Promise<FlatForest> => {
  const forest: FlatForest = { nodes: [], parents: [], hasChildren: [] };
  const stack: Pending[] = roots.map(node => ({ node, parent: ROOT_PARENT })).toReversed();
  const slice = new TimeSlice();
  for (let entry = stack.pop(); entry !== undefined; entry = stack.pop()) {
    const index = forest.nodes.length;
    const children = childrenOf(entry.node);
    forest.nodes.push(entry.node);
    forest.parents.push(entry.parent);
    forest.hasChildren.push(children !== null);
    pushReversed(
      stack,
      (children ?? []).map(node => ({ node, parent: index })),
    );
    // oxlint-disable-next-line no-await-in-loop -- hand the thread back between slices
    if (stack.length > 0 && slice.due()) await slice.yield();
  }
  return forest;
};

export const resolveScope = async (
  figmaCtx: typeof figma,
  root: unknown,
): Promise<readonly SceneNode[]> => {
  if (root === undefined || root === null) return figmaCtx.currentPage.children;
  if (typeof root !== 'string') throw new TypeError('root must be a string node id');
  const node = await figmaCtx.getNodeByIdAsync(root);
  if (isSceneNode(node)) return [node];
  return node?.type === 'PAGE' ? node.children : [];
};
