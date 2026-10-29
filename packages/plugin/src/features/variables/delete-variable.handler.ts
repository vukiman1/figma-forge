import {
  DELETE_VARIABLE_TOOL_NAME as TOOL,
  deleteVariableParams,
  type VariableResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireVariable } from './lookup.js';

export const createDeleteVariableHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { variableId } = parseParams(TOOL, deleteVariableParams, raw);
    const variable = await requireVariable(figmaCtx, TOOL, variableId);
    const { name } = variable;
    variable.remove();
    const result: VariableResult = { ok: true, variableId, name };
    return result;
  };
