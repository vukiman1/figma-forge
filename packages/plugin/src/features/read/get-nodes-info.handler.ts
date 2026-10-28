import {
  GET_NODES_INFO_TOOL_NAME as TOOL,
  getNodesInfoParams,
  type GetNodesInfoResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { RESULT_LIMIT_LABEL, resultCharBudget, serializeTrees } from '../../serializer.js';
import { isSceneNode } from '../nodes/scene-node.js';
import { parseParams } from '../parse-params.js';

type TreeRun = Awaited<ReturnType<typeof serializeTrees>>;

interface IdentifiedRun {
  readonly id: string;
  readonly run: TreeRun;
}

const tooLargeTogether = (runs: readonly IdentifiedRun[]): Error => {
  const sizes = runs.map(({ id, run }) => `${id}: ${run.total} nodes`).join(', ');
  return new Error(
    `${TOOL}: the requested trees together serialize past ${RESULT_LIMIT_LABEL} — more ` +
      `than one tool result can carry (${sizes}). Ask for fewer ids per call, or read a large ` +
      'one in parts: get_node on one of its children, or get_design_context, which splits a ' +
      'large tree into sections.',
  );
};

export const createGetNodesInfoHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeIds } = parseParams(TOOL, getNodesInfoParams, raw);
    const sharedBudget = resultCharBudget();
    const runs = await Promise.all(
      nodeIds.map(async (id): Promise<IdentifiedRun | null> => {
        const node = await figmaCtx.getNodeByIdAsync(id);
        return isSceneNode(node) ? { id, run: await serializeTrees([node], sharedBudget) } : null;
      }),
    );
    const found = runs.filter(entry => entry !== null);
    if (found.some(({ run }) => !run.complete)) throw tooLargeTogether(found);
    const result: GetNodesInfoResult = { nodes: runs.map(entry => entry?.run.nodes[0] ?? null) };
    return result;
  };
