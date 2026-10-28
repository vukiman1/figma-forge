import {
  IMPORT_STYLE_TOOL_NAME as TOOL,
  importStyleParams,
  type StyleResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';

export const createImportStyleHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { styleKey } = parseParams(TOOL, importStyleParams, raw);
    const style = await figmaCtx.importStyleByKeyAsync(styleKey);
    const result: StyleResult = { ok: true, styleId: style.id, name: style.name };
    return result;
  };
