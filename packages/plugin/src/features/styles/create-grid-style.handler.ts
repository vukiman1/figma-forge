import {
  CREATE_GRID_STYLE_TOOL_NAME as TOOL,
  createGridStyleParams,
  type StyleResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { toFigmaLayoutGridsBound } from '../layout/bound-layout-grids.js';
import { parseParams } from '../parse-params.js';

export const createCreateGridStyleHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { name, grids, description } = parseParams(TOOL, createGridStyleParams, raw);
    const layoutGrids = await toFigmaLayoutGridsBound(figmaCtx, grids, TOOL);
    const style = figmaCtx.createGridStyle();
    style.name = name;
    style.layoutGrids = layoutGrids;
    if (description !== undefined) style.description = description;
    const result: StyleResult = { ok: true, styleId: style.id, name: style.name };
    return result;
  };
