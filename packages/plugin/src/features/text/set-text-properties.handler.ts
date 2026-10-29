import {
  type MutateResult,
  pickDefined,
  SET_TEXT_PROPERTIES_TOOL_NAME as TOOL,
  setTextPropertiesParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { loadTextFonts, toFigmaFontName } from './fonts.js';
import { requireTextLike, unsupportedOnPath } from './text-like.js';
import { toFigmaLetterSpacing, toFigmaLineHeight } from './text-metrics.js';

const PLAIN_FIELDS = [
  'textCase',
  'textDecoration',
  'paragraphSpacing',
  'paragraphIndent',
  'textWrapStyle',
  'textAlignHorizontal',
  'textAlignVertical',
  'textAutoResize',
  'textTruncation',
  'maxLines',
] as const;

export const createSetTextPropertiesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, fontName, fontSize, lineHeight, letterSpacing, ...rest } = parseParams(
      TOOL,
      setTextPropertiesParams,
      raw,
    );
    const text = await requireTextLike(figmaCtx, TOOL, nodeId);
    const missing = text.type === 'TEXT_PATH' ? unsupportedOnPath({ lineHeight, ...rest }) : [];
    if (missing.length > 0) {
      throw new Error(
        `${TOOL}: ${nodeId} is text on a path, which has no ${missing.join(', ')} (its text ` +
          'follows the path, so there are no lines, boxes or paragraphs to set)',
      );
    }
    const plain = pickDefined(rest, PLAIN_FIELDS);
    const font = fontName === undefined ? undefined : toFigmaFontName(fontName);
    const writes = [font, fontSize, lineHeight, letterSpacing].some(value => value !== undefined);
    if (writes || Object.keys(plain).length > 0) {
      await loadTextFonts(figmaCtx, text, font === undefined ? [] : [font]);
    }
    if (font !== undefined) Reflect.set(text, 'fontName', font);
    if (fontSize !== undefined) text.fontSize = fontSize;
    if (lineHeight !== undefined) Reflect.set(text, 'lineHeight', toFigmaLineHeight(lineHeight));
    if (letterSpacing !== undefined) text.letterSpacing = toFigmaLetterSpacing(letterSpacing);
    Object.assign(text, plain);
    const result: MutateResult = { ok: true, nodeId: text.id };
    return result;
  };
