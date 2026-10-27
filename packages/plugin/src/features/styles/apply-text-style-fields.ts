import type { createTextStyleParams } from '@figma-forge/core';
import type { z } from 'zod';

import { loadFonts } from '../text/fonts.js';
import { toFigmaLetterSpacing, toFigmaLineHeight } from '../text/text-metrics.js';
import { applyTextStyleBindings } from '../text/text-style-bindings.js';
import type { VariableTable } from '../variables/resolve-variables.js';

export type TextStyleFields = Omit<z.output<typeof createTextStyleParams>, 'name'>;

export const applyTextStyleFields = async (
  figmaCtx: typeof figma,
  style: TextStyle,
  fields: TextStyleFields,
  font: FontNameInput | undefined,
  table: VariableTable,
): Promise<void> => {
  if (font !== undefined) Reflect.set(style, 'fontName', font);
  await loadFonts(figmaCtx, [style.fontName]);
  if (fields.fontSize !== undefined) style.fontSize = fields.fontSize;
  if (fields.lineHeight !== undefined) style.lineHeight = toFigmaLineHeight(fields.lineHeight);
  if (fields.letterSpacing !== undefined) {
    style.letterSpacing = toFigmaLetterSpacing(fields.letterSpacing);
  }
  if (fields.textWrapStyle !== undefined) style.textWrapStyle = fields.textWrapStyle;
  if (fields.description !== undefined) style.description = fields.description;
  if (fields.boundVariables !== undefined) {
    await applyTextStyleBindings(figmaCtx, style, fields.boundVariables, table);
  }
};
