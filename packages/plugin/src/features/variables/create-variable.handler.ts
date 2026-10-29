import {
  CREATE_VARIABLE_TOOL_NAME as TOOL,
  createVariableParams,
  type VariableResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { errorMessage } from '../error-message.js';
import { parseParams } from '../parse-params.js';
import { requireCollection } from './lookup.js';

const applyScopes = (
  variable: Variable,
  resolvedType: VariableResolvedDataType,
  scopes: readonly VariableScope[],
): void => {
  try {
    variable.scopes = [...scopes];
  } catch (error) {
    variable.remove();
    throw new Error(
      `${TOOL}: Figma refused scopes ${JSON.stringify(scopes)} on the new ${resolvedType} ` +
        `variable (${errorMessage(error)}), so nothing was created. EASING and TIMING variables ` +
        'take no scopes; other types take only scopes that fit them.',
      { cause: error },
    );
  }
};

export const createCreateVariableHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { name, collectionId, resolvedType, scopes } = parseParams(
      TOOL,
      createVariableParams,
      raw,
    );
    const collection = await requireCollection(figmaCtx, TOOL, collectionId);
    const variable = figmaCtx.variables.createVariable(name, collection, resolvedType);
    if (scopes !== undefined) applyScopes(variable, resolvedType, scopes);
    const result: VariableResult = { ok: true, variableId: variable.id, name: variable.name };
    return result;
  };
