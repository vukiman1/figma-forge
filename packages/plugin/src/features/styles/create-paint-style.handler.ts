import {
  CREATE_PAINT_STYLE_TOOL_NAME as TOOL,
  createPaintStyleParams,
  type StyleResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { toFigmaPaintsBound } from '../paint/bound-paints.js';
import { parseParams } from '../parse-params.js';

export const createCreatePaintStyleHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { name, paints, description } = parseParams(TOOL, createPaintStyleParams, raw);
    const figmaPaints = await toFigmaPaintsBound(figmaCtx, paints, TOOL);
    const style = figmaCtx.createPaintStyle();
    style.name = name;
    style.paints = figmaPaints;
    if (description !== undefined) style.description = description;
    const result: StyleResult = { ok: true, styleId: style.id, name: style.name };
    return result;
  };
