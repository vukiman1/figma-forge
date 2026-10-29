import { batchTool } from './inverse.js';

export const nodeForOp = async (
  figmaCtx: typeof figma,
  id: string,
  tool: string,
): Promise<BaseNode> => {
  const node = await figmaCtx.getNodeByIdAsync(id);
  if (node === null) throw new Error(`${batchTool(tool)}: node ${id} not found`);
  return node;
};

export const liveNode = async (figmaCtx: typeof figma, id: string): Promise<BaseNode | null> => {
  const node = await figmaCtx.getNodeByIdAsync(id);
  return node === null || node.removed ? null : node;
};

export const joinNotes = (notes: readonly unknown[]): string | undefined => {
  const text = notes.filter((note): note is string => typeof note === 'string');
  return text.length === 0 ? undefined : text.join('; ');
};
