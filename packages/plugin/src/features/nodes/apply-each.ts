export const applyEach = async (
  figmaCtx: typeof figma,
  ids: readonly string[],
  apply: (node: BaseNode) => boolean,
): Promise<string[]> => {
  const nodes = await Promise.all(ids.map(async id => figmaCtx.getNodeByIdAsync(id)));
  return ids.filter((_id, index) => {
    const node = nodes[index] ?? null;
    return node !== null && apply(node);
  });
};
