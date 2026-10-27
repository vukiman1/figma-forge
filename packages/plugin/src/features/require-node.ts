export const requireNode = async (
  figmaCtx: typeof figma,
  tool: string,
  nodeId: string,
): Promise<BaseNode> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node === null) throw new Error(`${tool}: node ${nodeId} not found`);
  return node;
};
