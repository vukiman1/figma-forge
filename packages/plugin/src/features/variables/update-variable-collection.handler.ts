import {
  UPDATE_VARIABLE_COLLECTION_TOOL_NAME as TOOL,
  type UpdateCollectionResult,
  updateVariableCollectionParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { requireCollection } from './lookup.js';

interface ModeRename {
  modeId: string;
  name: string;
}

const assertRenamable = (renames: readonly ModeRename[], collection: VariableCollection): void => {
  const seen = new Set<string>();
  for (const { modeId } of renames) {
    if (!collection.modes.some(mode => mode.modeId === modeId)) {
      throw new Error(`${TOOL}: collection "${collection.name}" has no mode ${modeId}`);
    }
    if (seen.has(modeId)) throw new Error(`${TOOL}: modes names ${modeId} more than once`);
    seen.add(modeId);
  }
};

export const createUpdateVariableCollectionHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const {
      collectionId,
      name,
      modes = [],
    } = parseParams(TOOL, updateVariableCollectionParams, raw);
    const collection = await requireCollection(figmaCtx, TOOL, collectionId);
    assertRenamable(modes, collection);
    if (name !== undefined) collection.name = name;
    for (const rename of modes) collection.renameMode(rename.modeId, rename.name);
    const result: UpdateCollectionResult = {
      ok: true,
      collectionId: collection.id,
      name: collection.name,
      modes: collection.modes.map(mode => ({ modeId: mode.modeId, name: mode.name })),
    };
    return result;
  };
