export const swapBack = async (
  figmaCtx: typeof figma,
  instance: InstanceNode,
  mainId: string,
): Promise<void> => {
  const main = await instance.getMainComponentAsync();
  if (main?.id === mainId) return;
  const component = await figmaCtx.getNodeByIdAsync(mainId);
  if (component?.type !== 'COMPONENT') throw new Error(`component ${mainId} no longer exists`);
  instance.swapComponent(component);
};
