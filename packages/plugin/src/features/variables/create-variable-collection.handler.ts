import {
  type CollectionResult,
  CREATE_VARIABLE_COLLECTION_TOOL_NAME as TOOL,
  createVariableCollectionParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';

export const createCreateVariableCollectionHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { name } = parseParams(TOOL, createVariableCollectionParams, raw);
    const collection = figmaCtx.variables.createVariableCollection(name);
    const result: CollectionResult = {
      ok: true,
      collectionId: collection.id,
      defaultModeId: collection.defaultModeId,
      name: collection.name,
    };
    return result;
  };
