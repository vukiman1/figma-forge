import {
  IMPORT_VARIABLE_TOOL_NAME as TOOL,
  importVariableParams,
  type VariableResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';

export const createImportVariableHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { variableKey } = parseParams(TOOL, importVariableParams, raw);
    const variable = await figmaCtx.variables.importVariableByKeyAsync(variableKey);
    const result: VariableResult = { ok: true, variableId: variable.id, name: variable.name };
    return result;
  };
