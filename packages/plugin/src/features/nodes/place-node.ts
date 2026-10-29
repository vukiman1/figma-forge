export const placeNode = async (
  figmaCtx: typeof figma,
  node: SceneNode,
  parentId: string | undefined,
  tool: string,
): Promise<void> => {
  if (parentId === undefined) {
    figmaCtx.currentPage.appendChild(node);
    return;
  }
  const parent = await figmaCtx.getNodeByIdAsync(parentId);
  if (parent === null || parent.type === 'DOCUMENT' || !('appendChild' in parent)) {
    node.remove();
    throw new Error(`${tool}: parent ${parentId} not found or cannot contain children`);
  }
  parent.appendChild(node);
};
