import {
  type DeleteModeResult,
  DELETE_VARIABLE_MODE_TOOL_NAME as TOOL,
  deleteVariableModeParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireCollection } from './lookup.js';

export const createDeleteVariableModeHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { collectionId, modeId } = parseParams(TOOL, deleteVariableModeParams, raw);
    const collection = await requireCollection(figmaCtx, TOOL, collectionId);
    const mode = collection.modes.find(candidate => candidate.modeId === modeId);
    if (mode === undefined) {
      throw new Error(`${TOOL}: collection "${collection.name}" has no mode ${modeId}`);
    }
    collection.removeMode(modeId);
    const result: DeleteModeResult = {
      ok: true,
      collectionId: collection.id,
      modeId,
      name: mode.name,
    };
    return result;
  };
