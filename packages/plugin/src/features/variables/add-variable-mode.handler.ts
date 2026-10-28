import {
  ADD_VARIABLE_MODE_TOOL_NAME as TOOL,
  addVariableModeParams,
  type ModeResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { errorMessage } from '../error-message.js';
import { parseParams } from '../parse-params.js';
import { requireCollection } from './lookup.js';

const PLAN_LIMIT = /limit|plan|upgrade|maximum/i;

const planLimitError = (collection: VariableCollection, modeName: string, cause: unknown): Error =>
  new Error(
    `${TOOL}: the file's Figma plan does not allow another mode on "${collection.name}" ` +
      `(${errorMessage(cause)}). Fall back to a paired collection: create a collection named ` +
      `for the theme (e.g. "${collection.name}/${modeName}") holding the same variable names ` +
      "with that theme's values.",
    { cause },
  );

const addMode = (collection: VariableCollection, modeName: string): string => {
  try {
    return collection.addMode(modeName);
  } catch (error) {
    if (PLAN_LIMIT.test(errorMessage(error))) throw planLimitError(collection, modeName, error);
    throw error;
  }
};

export const createAddVariableModeHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { collectionId, name } = parseParams(TOOL, addVariableModeParams, raw);
    const collection = await requireCollection(figmaCtx, TOOL, collectionId);
    const result: ModeResult = { ok: true, modeId: addMode(collection, name), name };
    return result;
  };
