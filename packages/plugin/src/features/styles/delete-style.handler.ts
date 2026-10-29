import {
  DELETE_STYLE_TOOL_NAME as TOOL,
  deleteStyleParams,
  type StyleResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireStyle } from './require-style.js';

export const createDeleteStyleHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { styleId } = parseParams(TOOL, deleteStyleParams, raw);
    const style = await requireStyle(figmaCtx, TOOL, styleId);
    const { name } = style;
    style.remove();
    const result: StyleResult = { ok: true, styleId, name };
    return result;
  };
