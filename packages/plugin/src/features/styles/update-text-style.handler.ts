import {
  type StyleResult,
  UPDATE_TEXT_STYLE_TOOL_NAME as TOOL,
  updateTextStyleParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { loadFonts, toFigmaFontName } from '../text/fonts.js';
import { resolveTextStyleBindings } from '../text/text-style-bindings.js';
import { applyTextStyleFields } from './apply-text-style-fields.js';
import { requireStyleOf } from './require-style.js';

export const createUpdateTextStyleHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { styleId, name, ...fields } = parseParams(TOOL, updateTextStyleParams, raw);
    const style = await requireStyleOf(figmaCtx, TOOL, styleId, 'TEXT');
    const table = await resolveTextStyleBindings(figmaCtx, fields.boundVariables ?? {}, TOOL);
    const font = fields.fontName === undefined ? undefined : toFigmaFontName(fields.fontName);
    if (font !== undefined) await loadFonts(figmaCtx, [font]);
    if (name !== undefined) style.name = name;
    await applyTextStyleFields(figmaCtx, style, fields, font, table);
    const result: StyleResult = { ok: true, styleId: style.id, name: style.name };
    return result;
  };
