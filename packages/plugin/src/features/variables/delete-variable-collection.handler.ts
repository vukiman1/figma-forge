import {
  type DeleteCollectionResult,
  DELETE_VARIABLE_COLLECTION_TOOL_NAME as TOOL,
  deleteVariableCollectionParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireCollection } from './lookup.js';

export const createDeleteVariableCollectionHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { collectionId } = parseParams(TOOL, deleteVariableCollectionParams, raw);
    const collection = await requireCollection(figmaCtx, TOOL, collectionId);
    const { name } = collection;
    collection.remove();
    const result: DeleteCollectionResult = { ok: true, collectionId, name };
    return result;
  };
