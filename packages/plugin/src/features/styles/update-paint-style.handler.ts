import {
  type StyleResult,
  UPDATE_PAINT_STYLE_TOOL_NAME as TOOL,
  updatePaintStyleParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { toFigmaPaintsBound } from '../paint/bound-paints.js';
import { parseParams } from '../parse-params.js';
import { requireStyleOf } from './require-style.js';

export const createUpdatePaintStyleHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { styleId, name, paints, description } = parseParams(TOOL, updatePaintStyleParams, raw);
    const style = await requireStyleOf(figmaCtx, TOOL, styleId, 'PAINT');
    const figmaPaints =
      paints === undefined ? undefined : await toFigmaPaintsBound(figmaCtx, paints, TOOL);
    if (name !== undefined) style.name = name;
    if (figmaPaints !== undefined) style.paints = figmaPaints;
    if (description !== undefined) style.description = description;
    const result: StyleResult = { ok: true, styleId: style.id, name: style.name };
    return result;
  };
