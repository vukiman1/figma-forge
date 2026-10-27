export const requireInstance = async (
  figmaCtx: typeof figma,
  tool: string,
  nodeId: string,
): Promise<InstanceNode> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node?.type !== 'INSTANCE') throw new Error(`${tool}: node ${nodeId} is not an INSTANCE`);
  return node;
};

export const resolveComponent = async (
  figmaCtx: typeof figma,
  tool: string,
  source: { componentId?: string | undefined; componentKey?: string | undefined },
): Promise<ComponentNode> => {
  if (source.componentKey !== undefined) {
    return figmaCtx.importComponentByKeyAsync(source.componentKey);
  }
  if (source.componentId === undefined) {
    throw new TypeError(`${tool}: provide componentId or componentKey`);
  }
  const node = await figmaCtx.getNodeByIdAsync(source.componentId);
  if (node?.type !== 'COMPONENT') {
    throw new Error(`${tool}: component ${source.componentId} not found`);
  }
  return node;
};
