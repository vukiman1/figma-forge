import {
  SET_VARIABLE_VALUE_TOOL_NAME as TOOL,
  setVariableValueParams,
  type VariableResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { coerceVariableValue } from './coerce-variable-value.js';
import { requireVariable } from './lookup.js';
import { toFigmaVariableValue } from './to-figma-variable-value.js';

export const createSetVariableValueHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { variableId, modeId, value } = parseParams(TOOL, setVariableValueParams, raw);
    const variable = await requireVariable(figmaCtx, TOOL, variableId);
    const coerced = parseParams(
      TOOL,
      setVariableValueParams.shape.value,
      coerceVariableValue(value, variable.resolvedType),
    );
    variable.setValueForMode(modeId, toFigmaVariableValue(coerced, figmaCtx));
    const result: VariableResult = { ok: true, variableId: variable.id, name: variable.name };
    return result;
  };
