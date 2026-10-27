export type NodeWith<K extends string> = BaseNode & Record<K, unknown>;

export const hasField = <K extends string>(node: BaseNode, field: K): node is NodeWith<K> =>
  field in node;

export const requireNode = async (
  figmaCtx: typeof figma,
  tool: string,
  nodeId: string,
): Promise<BaseNode> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node === null) throw new Error(`${tool}: node ${nodeId} not found`);
  return node;
};

export const requireNodeWith = async <K extends string>(
  figmaCtx: typeof figma,
  tool: string,
  nodeId: string,
  field: K,
  missing: string,
): Promise<NodeWith<K>> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node === null || !hasField(node, field)) {
    throw new Error(`${tool}: node ${nodeId} not found or ${missing}`);
  }
  return node;
};
