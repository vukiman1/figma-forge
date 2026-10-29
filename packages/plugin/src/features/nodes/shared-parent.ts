import { isSceneNode } from './scene-node.js';

type Container = BaseNode & ChildrenMixin;

export interface SharedParent {
  readonly nodes: SceneNode[];
  readonly parent: Container;
  readonly index: number;
}

const requireLayers = async (
  figmaCtx: typeof figma,
  ids: readonly string[],
  tool: string,
): Promise<SceneNode[]> => {
  const resolved = await Promise.all(ids.map(async id => figmaCtx.getNodeByIdAsync(id)));
  return resolved.map((node, index) => {
    if (node === null) throw new Error(`${tool}: node ${ids[index]} not found`);
    if (!isSceneNode(node))
      throw new Error(`${tool}: node ${ids[index]} is a ${node.type}, not a layer`);
    return node;
  });
};

const requireOneParent = (nodes: readonly SceneNode[], tool: string): Container => {
  const parent = nodes[0]?.parent ?? null;
  if (parent === null) throw new Error(`${tool}: nodes have no parent that can hold the result`);
  const other = nodes.find(node => node.parent !== parent);
  if (other !== undefined) {
    throw new Error(
      `${tool}: nodes must share one parent — ${other.id} is under a different one. ` +
        'Move them together first with reparent_nodes.',
    );
  }
  return parent;
};

export const resolveSharedParent = async (
  figmaCtx: typeof figma,
  ids: readonly string[],
  tool: string,
): Promise<SharedParent> => {
  const nodes = await requireLayers(figmaCtx, ids, tool);
  const parent = requireOneParent(nodes, tool);
  const stackIndex = (node: SceneNode): number => parent.children.indexOf(node);
  const stacked = nodes.toSorted((a, b) => stackIndex(a) - stackIndex(b));
  const topmost = stacked.at(-1);
  return { nodes: stacked, parent, index: topmost === undefined ? 0 : stackIndex(topmost) };
};
