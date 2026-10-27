import {
  SET_NODE_VARIABLE_MODE_TOOL_NAME as TOOL,
  setNodeVariableModeParams,
  type VariableModeResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { requireNode } from '../require-node.js';
import { requireCollection } from './lookup.js';

type ModeBearer = BaseNode &
  Pick<
    SceneNode,
    | 'explicitVariableModes'
    | 'setExplicitVariableModeForCollection'
    | 'clearExplicitVariableModeForCollection'
  >;

const bearsModes = (node: BaseNode): node is ModeBearer =>
  'setExplicitVariableModeForCollection' in node &&
  typeof node.setExplicitVariableModeForCollection === 'function';

const requireMode = (collection: VariableCollection, modeId: string): { name: string } => {
  const mode = collection.modes.find(candidate => candidate.modeId === modeId);
  if (mode !== undefined) return mode;
  const modes = collection.modes.map(m => `${m.name} (${m.modeId})`).join(', ');
  throw new Error(
    `${TOOL}: mode ${modeId} is not in collection "${collection.name}" — its modes are ${modes}`,
  );
};

const applyMode = (
  node: ModeBearer,
  collection: VariableCollection,
  modeId: string | null,
): string | null => {
  if (modeId === null) {
    node.clearExplicitVariableModeForCollection(collection);
    return null;
  }
  const mode = requireMode(collection, modeId);
  node.setExplicitVariableModeForCollection(collection, modeId);
  return mode.name;
};

const assertModeKept = (
  node: ModeBearer,
  collection: VariableCollection,
  modeId: string | null,
) => {
  const now = node.explicitVariableModes[collection.id] ?? null;
  if (now === modeId) return;
  throw new Error(
    `${TOOL}: Figma kept ${node.type} ${node.id} on ` +
      `${now === null ? 'no explicit mode' : `mode ${now}`} for "${collection.name}"`,
  );
};

export const createSetNodeVariableModeHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, collectionId, modeId } = parseParams(TOOL, setNodeVariableModeParams, raw);
    const node = await requireNode(figmaCtx, TOOL, nodeId);
    if (!bearsModes(node)) {
      throw new Error(`${TOOL}: node ${nodeId} (${node.type}) cannot take a variable mode`);
    }
    const collection = await requireCollection(figmaCtx, TOOL, collectionId);
    const modeName = applyMode(node, collection, modeId);
    assertModeKept(node, collection, modeId);
    const result: VariableModeResult = {
      ok: true,
      nodeId: node.id,
      collectionId: collection.id,
      collectionName: collection.name,
      modeId,
      modeName,
    };
    return result;
  };
