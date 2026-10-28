import type { z } from 'zod';

import { batchTool, type BatchInverse, defineInverse, type InverseSpec } from '../inverse.js';
import { resultId } from '../op-result.js';

interface CreateState {
  readonly parentId: string | null;
}

const parentIdOf = (params: object): string | null =>
  'parentId' in params && typeof params.parentId === 'string' ? params.parentId : null;

const assertContainer = async (
  figmaCtx: typeof figma,
  tool: string,
  parentId: string,
): Promise<void> => {
  const parent = await figmaCtx.getNodeByIdAsync(parentId);
  if (parent === null || !('appendChild' in parent)) {
    throw new Error(`${batchTool(tool)}: parent ${parentId} not found or cannot contain children`);
  }
};

const removeCreated = async (figmaCtx: typeof figma, result: unknown): Promise<undefined> => {
  const id = resultId(result);
  const node = id === null ? null : await figmaCtx.getNodeByIdAsync(id);
  if (node !== null && 'remove' in node) node.remove();
  return undefined;
};

export const createSpec = (tool: string, hasParent = true): InverseSpec<object, CreateState> => ({
  capture: async (figmaCtx, params) => {
    const parentId = hasParent ? parentIdOf(params) : null;
    if (parentId !== null) await assertContainer(figmaCtx, tool, parentId);
    return { parentId };
  },
  undo: async (figmaCtx, _state, result) => removeCreated(figmaCtx, result),
  resizes: ({ parentId }) => (parentId === null ? [] : [parentId]),
});

export const createInverse = (
  tool: string,
  schema: z.ZodType<object>,
  hasParent = true,
): BatchInverse => defineInverse(tool, schema, createSpec(tool, hasParent));
