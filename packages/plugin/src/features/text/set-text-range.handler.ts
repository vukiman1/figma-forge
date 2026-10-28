import {
  type MutateResult,
  SET_TEXT_RANGE_TOOL_NAME as TOOL,
  setTextRangeParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { resolveVariables } from '../variables/resolve-variables.js';
import { applyTextRange, type TextRange } from './apply-text-range.js';
import { loadTextFonts, toFigmaFontName } from './fonts.js';
import { NOT_ON_A_PATH, requireTextLike, type TextLike, unsupportedOnPath } from './text-like.js';

const fieldsMissingOnPath = (ranges: readonly TextRange[]): string[] => [
  ...new Set(
    ranges.flatMap(range => [
      ...unsupportedOnPath(range),
      ...Object.keys(range.boundVariables ?? {}).filter(field => NOT_ON_A_PATH.has(field)),
    ]),
  ),
];

const assertDrawableOnPath = (text: TextLike, ranges: readonly TextRange[]): void => {
  if (text.type !== 'TEXT_PATH') return;
  const missing = fieldsMissingOnPath(ranges);
  if (missing.length === 0) return;
  throw new Error(
    `${TOOL}: ${text.id} is text on a path, which does not draw ${missing.join(', ')}`,
  );
};

const assertInBounds = (ranges: readonly TextRange[], length: number): void => {
  for (const { start, end } of ranges) {
    if (start < 0 || end > length || start >= end) {
      throw new RangeError(
        `${TOOL}: range ${start}–${end} is out of bounds or empty (text length ${length})`,
      );
    }
  }
};

export const createSetTextRangeHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, ranges } = parseParams(TOOL, setTextRangeParams, raw);
    const text = await requireTextLike(figmaCtx, TOOL, nodeId);
    assertDrawableOnPath(text, ranges);
    assertInBounds(ranges, text.characters.length);
    const rangeFonts = ranges.flatMap(range =>
      range.fontName === undefined ? [] : [toFigmaFontName(range.fontName)],
    );
    const boundIds = ranges.flatMap(range =>
      Object.values(range.boundVariables ?? {}).filter(id => id !== null),
    );
    const table = await resolveVariables(figmaCtx, boundIds, TOOL);
    await loadTextFonts(figmaCtx, text, rangeFonts);
    for (const range of ranges) {
      // oxlint-disable-next-line no-await-in-loop -- a later range overrides an earlier one where they overlap
      await applyTextRange(figmaCtx, text, range, table);
    }
    const result: MutateResult = { ok: true, nodeId: text.id };
    return result;
  };
