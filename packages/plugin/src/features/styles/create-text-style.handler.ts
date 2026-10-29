import {
  CREATE_TEXT_STYLE_TOOL_NAME as TOOL,
  createTextStyleParams,
  type StyleResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { loadFonts, toFigmaFontName } from '../text/fonts.js';
import { resolveTextStyleBindings } from '../text/text-style-bindings.js';
import { applyTextStyleFields } from './apply-text-style-fields.js';

export const createCreateTextStyleHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { name, ...fields } = parseParams(TOOL, createTextStyleParams, raw);
    const table = await resolveTextStyleBindings(figmaCtx, fields.boundVariables ?? {}, TOOL);
    const font = fields.fontName === undefined ? undefined : toFigmaFontName(fields.fontName);
    if (font !== undefined) await loadFonts(figmaCtx, [font]);
    const style = figmaCtx.createTextStyle();
    try {
      style.name = name;
      await applyTextStyleFields(figmaCtx, style, fields, font, table);
    } catch (error) {
      style.remove();
      throw error;
    }
    const result: StyleResult = { ok: true, styleId: style.id, name: style.name };
    return result;
  };
