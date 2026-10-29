import {
  RENAME_VARIABLE_TOOL_NAME as TOOL,
  renameVariableParams,
  type VariableResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireVariable } from './lookup.js';

export const createRenameVariableHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { variableId, name } = parseParams(TOOL, renameVariableParams, raw);
    const variable = await requireVariable(figmaCtx, TOOL, variableId);
    variable.name = name;
    const result: VariableResult = { ok: true, variableId: variable.id, name: variable.name };
    return result;
  };
