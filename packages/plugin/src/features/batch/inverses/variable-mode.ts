import { SET_NODE_VARIABLE_MODE_TOOL_NAME, setNodeVariableModeParams } from '@figma-forge/core';

import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { liveNode, nodeForOp } from '../live-node.js';

const TOOL = SET_NODE_VARIABLE_MODE_TOOL_NAME;

interface VariableModeState {
  readonly id: string;
  readonly collectionId: string;
  readonly previous: string | null;
}

const restoreMode = async (
  figmaCtx: typeof figma,
  { id, collectionId, previous }: VariableModeState,
): Promise<string | undefined> => {
  const node = await liveNode(figmaCtx, id);
  if (node === null || !('explicitVariableModes' in node)) return undefined;
  const collection = await figmaCtx.variables.getVariableCollectionByIdAsync(collectionId);
  if (collection === null) {
    return `variable collection ${collectionId} is gone, so ${id}'s mode for it was not put back`;
  }
  const isStillAMode = collection.modes.some(mode => mode.modeId === previous);
  if (previous === null || !isStillAMode) node.clearExplicitVariableModeForCollection(collection);
  else node.setExplicitVariableModeForCollection(collection, previous);
  return undefined;
};

export const setNodeVariableModeInverse: BatchInverse = defineInverse(
  TOOL,
  setNodeVariableModeParams,
  {
    capture: async (figmaCtx, { nodeId, collectionId }): Promise<VariableModeState> => {
      const node = await nodeForOp(figmaCtx, nodeId, TOOL);
      if (!('explicitVariableModes' in node)) {
        throw new Error(
          `${batchTool(TOOL)}: node ${nodeId} (${node.type}) cannot take a variable mode`,
        );
      }
      return {
        id: nodeId,
        collectionId,
        previous: node.explicitVariableModes[collectionId] ?? null,
      };
    },
    undo: async (figmaCtx, state) => restoreMode(figmaCtx, state),
    touches: ({ id }) => [id],
  },
);
