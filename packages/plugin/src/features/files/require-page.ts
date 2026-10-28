export const requirePage = async (
  figmaCtx: typeof figma,
  tool: string,
  pageId: string,
): Promise<PageNode> => {
  const node = await figmaCtx.getNodeByIdAsync(pageId);
  if (node?.type === 'PAGE') return node;
  throw new Error(`${tool}: page ${pageId} not found`);
};
