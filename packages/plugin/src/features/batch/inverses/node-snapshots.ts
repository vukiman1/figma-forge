import type { z } from 'zod';

import { isSceneNode } from '../../nodes/scene-node.js';
import { type BatchInverse, defineInverse } from '../inverse.js';
import { liveNode } from '../live-node.js';
import { readField, writeIfDifferent } from '../snapshot/values.js';

interface NodeFields {
  readonly id: string;
  readonly values: Record<string, unknown>;
}

const fieldsOf = (node: SceneNode, fields: readonly string[]): Record<string, unknown> | null =>
  fields.every(field => field in node)
    ? Object.fromEntries(fields.map(field => [field, readField(node, field)]))
    : null;

const captureFields = async (
  figmaCtx: typeof figma,
  nodeIds: readonly string[],
  fields: readonly string[],
): Promise<NodeFields[]> => {
  const nodes = await Promise.all(nodeIds.map(async id => figmaCtx.getNodeByIdAsync(id)));
  return nodes.flatMap((node, index) => {
    const values = isSceneNode(node) ? fieldsOf(node, fields) : null;
    const id = nodeIds[index];
    return values === null || id === undefined ? [] : [{ id, values }];
  });
};

const restoreFields = async (
  figmaCtx: typeof figma,
  states: readonly NodeFields[],
): Promise<undefined> => {
  const nodes = await Promise.all(states.map(async ({ id }) => liveNode(figmaCtx, id)));
  states.forEach(({ values }, index) => {
    const node = nodes[index] ?? null;
    if (node === null) return;
    for (const [field, value] of Object.entries(values)) writeIfDifferent(node, field, value);
  });
  return undefined;
};

const ids = (states: readonly NodeFields[]): string[] => states.map(({ id }) => id);

export const nodeFieldsInverse = (
  tool: string,
  schema: z.ZodType<{ nodeIds: string[] }>,
  fields: readonly string[],
  options: { readonly resizes?: boolean } = {},
): BatchInverse =>
  defineInverse(tool, schema, {
    capture: async (figmaCtx, { nodeIds }) => captureFields(figmaCtx, nodeIds, fields),
    undo: async (figmaCtx, states) => restoreFields(figmaCtx, states),
    touches: ids,
    ...(options.resizes === true && { resizes: ids }),
  });
