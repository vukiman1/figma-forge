import type { setTextRangeParams } from '@figma-forge/core';
import type { z } from 'zod';

import { toFigmaPaintsBound } from '../paint/bound-paints.js';
import { type VariableTable, variableFor } from '../variables/resolve-variables.js';
import { toFigmaFontName } from './fonts.js';
import type { TextLike } from './text-like.js';
import { toFigmaLetterSpacing, toFigmaLineHeight } from './text-metrics.js';

export type TextRange = z.output<typeof setTextRangeParams>['ranges'][number];

const TOOL = 'set_text_range';

const BLACK: RGB = { r: 0, g: 0, b: 0 };

const applyGlyphs = (text: TextLike, range: TextRange): void => {
  const { start, end } = range;
  if (range.fontName !== undefined) {
    text.setRangeFontName(start, end, toFigmaFontName(range.fontName));
  }
  if (range.fontSize !== undefined) text.setRangeFontSize(start, end, range.fontSize);
  if (range.textCase !== undefined) text.setRangeTextCase(start, end, range.textCase);
  if (range.letterSpacing !== undefined) {
    text.setRangeLetterSpacing(start, end, toFigmaLetterSpacing(range.letterSpacing));
  }
  if (range.hyperlink !== undefined) text.setRangeHyperlink(start, end, range.hyperlink);
};

const applyParagraphs = (text: TextNode, range: TextRange): void => {
  const { start, end } = range;
  if (range.textDecoration !== undefined) {
    text.setRangeTextDecoration(start, end, range.textDecoration);
  }
  if (range.lineHeight !== undefined) {
    text.setRangeLineHeight(start, end, toFigmaLineHeight(range.lineHeight));
  }
  if (range.listOptions !== undefined) {
    text.setRangeListOptions(start, end, { type: range.listOptions });
  }
  if (range.indentation !== undefined) text.setRangeIndentation(start, end, range.indentation);
  if (range.textWrapStyle !== undefined) {
    text.setRangeTextWrapStyle(start, end, range.textWrapStyle);
  }
};

const solidBase = (text: TextLike, start: number, end: number): SolidPaint => {
  const current = text.getRangeFills(start, end);
  const first = Array.isArray(current) ? current[0] : undefined;
  return first?.type === 'SOLID' ? first : { type: 'SOLID', color: BLACK };
};

const bindRangeField = (
  figmaCtx: typeof figma,
  text: TextLike,
  range: TextRange,
  [field, variableId]: [string, string | null],
  table: VariableTable,
): void => {
  const variable = variableId === null ? null : variableFor(table, variableId);
  const { start, end } = range;
  if (field === 'fills') {
    const bound = figmaCtx.variables.setBoundVariableForPaint(
      solidBase(text, start, end),
      'color',
      variable,
    );
    text.setRangeFills(start, end, [bound]);
    return;
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Figma validates the field name and rejects unknown ones
  text.setRangeBoundVariable(start, end, field as VariableBindableTextField, variable);
};

export const applyTextRange = async (
  figmaCtx: typeof figma,
  text: TextLike,
  range: TextRange,
  table: VariableTable,
): Promise<void> => {
  const { start, end } = range;
  applyGlyphs(text, range);
  if (text.type === 'TEXT') applyParagraphs(text, range);
  if (range.fills !== undefined) {
    text.setRangeFills(start, end, await toFigmaPaintsBound(figmaCtx, range.fills, TOOL));
  }
  if (range.textStyleId !== undefined)
    await text.setRangeTextStyleIdAsync(start, end, range.textStyleId);
  if (range.fillStyleId !== undefined)
    await text.setRangeFillStyleIdAsync(start, end, range.fillStyleId);
  for (const binding of Object.entries(range.boundVariables ?? {})) {
    bindRangeField(figmaCtx, text, range, binding, table);
  }
};
