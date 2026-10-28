import {
  GROUP_NODES_TOOL_NAME,
  groupNodesParams,
  REPEAT_NODES_TOOL_NAME,
  repeatNodesParams,
} from '@figma-forge/core';
import type { z } from 'zod';

import { isSceneNode } from '../../nodes/scene-node.js';
import { resolveSharedParent } from '../../nodes/shared-parent.js';
import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { removeLeftover } from '../op-result.js';
import { captureRehome, parentIds, refuseVariantLeaving, undoRehome } from './rehome.js';

interface WrapTargets {
  readonly nodes: readonly SceneNode[];
  readonly parent: BaseNode & ChildrenMixin;
}

type ResolveTargets = (figmaCtx: typeof figma, nodeIds: readonly string[]) => Promise<WrapTargets>;

const wrapInverse = (
  tool: string,
  schema: z.ZodType<{ nodeIds: string[] }>,
  targetsOf: ResolveTargets,
): BatchInverse =>
  defineInverse(tool, schema, {
    capture: async (figmaCtx, { nodeIds }) => {
      const { nodes, parent } = await targetsOf(figmaCtx, nodeIds);
      refuseVariantLeaving(tool, nodes, parent.id);
      return captureRehome(nodes, [parent]);
    },
    undo: async (figmaCtx, rehome, result) => {
      await undoRehome(figmaCtx, rehome);
      await removeLeftover(figmaCtx, result);
      return undefined;
    },
    resizes: parentIds,
    moves: async (figmaCtx, { nodeIds }) => {
      const { nodes, parent } = await targetsOf(figmaCtx, nodeIds);
      return { nodeIds: nodes.map(({ id }) => id), destinationId: parent.id };
    },
  });

const groupTargets: ResolveTargets = async (figmaCtx, nodeIds) => {
  const resolved = await Promise.all(nodeIds.map(async id => figmaCtx.getNodeByIdAsync(id)));
  const nodes = resolved.filter(isSceneNode);
  const parent = nodes[0]?.parent ?? null;
  if (parent === null || !('appendChild' in parent)) {
    throw new Error(
      `${batchTool(GROUP_NODES_TOOL_NAME)}: no valid nodes to group, or no groupable parent`,
    );
  }
  return { nodes, parent };
};

const repeatTargets: ResolveTargets = async (figmaCtx, nodeIds) =>
  resolveSharedParent(figmaCtx, [...new Set(nodeIds)], batchTool(REPEAT_NODES_TOOL_NAME));

export const groupNodesInverse: BatchInverse = wrapInverse(
  GROUP_NODES_TOOL_NAME,
  groupNodesParams,
  groupTargets,
);

export const repeatNodesInverse: BatchInverse = wrapInverse(
  REPEAT_NODES_TOOL_NAME,
  repeatNodesParams,
  repeatTargets,
);
