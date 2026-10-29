import {
  SET_VARIABLE_CODE_SYNTAX_TOOL_NAME as TOOL,
  setVariableCodeSyntaxParams,
  type VariableResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { serializeCodeSyntax } from '../../serialize/code-syntax.js';
import { parseParams } from '../parse-params.js';
import { requireVariable } from './lookup.js';

const PLATFORMS = ['WEB', 'ANDROID', 'iOS'] as const;

type Platform = (typeof PLATFORMS)[number];

const applyDeclaration = (variable: Variable, platform: Platform, name: string | null): void => {
  if (name === null) variable.removeVariableCodeSyntax(platform);
  else variable.setVariableCodeSyntax(platform, name);
};

export const createSetVariableCodeSyntaxHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { variableId, codeSyntax } = parseParams(TOOL, setVariableCodeSyntaxParams, raw);
    const variable = await requireVariable(figmaCtx, TOOL, variableId);
    for (const platform of PLATFORMS) {
      const name = codeSyntax[platform];
      if (name !== undefined) applyDeclaration(variable, platform, name);
    }
    const declared = serializeCodeSyntax(variable.codeSyntax);
    const result: VariableResult = {
      ok: true,
      variableId: variable.id,
      name: variable.name,
      ...(declared === undefined ? {} : { codeSyntax: declared }),
    };
    return result;
  };
