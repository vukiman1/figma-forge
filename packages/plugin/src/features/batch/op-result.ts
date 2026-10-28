import { liveNode } from './live-node.js';
import { readField } from './snapshot/values.js';

export const resultId = (result: unknown, key = 'nodeId'): string | null => {
  const id = readField(result, key);
  return typeof id === 'string' ? id : null;
};

export const removeLeftover = async (
  figmaCtx: typeof figma,
  result: unknown,
  always = false,
): Promise<void> => {
  const id = resultId(result);
  const node = id === null ? null : await liveNode(figmaCtx, id);
  if (node === null) return;
  const isEmptied = 'children' in node && node.children.length === 0;
  if (always || isEmptied) node.remove();
};
