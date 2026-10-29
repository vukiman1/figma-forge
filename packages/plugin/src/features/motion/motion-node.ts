export type MotionNode = BaseNode & MotionNodeMixin;

export const isMotionNode = (node: BaseNode): node is MotionNode => 'applyAnimationStyle' in node;

export const hasMotionState = (node: BaseNode): node is MotionNode => 'animations' in node;

export const assertFigmaEditor = (figmaCtx: typeof figma, tool: string): void => {
  if (figmaCtx.editorType !== 'figma') {
    throw new Error(`${tool}: Figma Motion is only available in the Figma Design editor.`);
  }
};

export const motionApi = (figmaCtx: typeof figma): MotionAPI | undefined =>
  figmaCtx.editorType === 'figjam' ? undefined : figmaCtx.motion;

export const readPlayheadPosition = (figmaCtx: typeof figma): number | undefined =>
  motionApi(figmaCtx)?.playheadPosition;

export const requireMotionNode = async (
  figmaCtx: typeof figma,
  tool: string,
  nodeId: string,
): Promise<MotionNode> => {
  assertFigmaEditor(figmaCtx, tool);
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node !== null && isMotionNode(node)) return node;
  throw new Error(`${tool}: node ${nodeId} not found or does not support Motion`);
};
