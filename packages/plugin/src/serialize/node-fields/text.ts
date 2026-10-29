import { MIXED, type SerializedNode } from '@figma-forge/core';

import { isFontName, serializeFontName } from '../font-name.js';
import { serializeTextSegments } from '../text-segments.js';
import { serializeLetterSpacing, serializeLineHeight } from '../text-spacing.js';

const LINE_BREAK = '\n';

const writeTypography = (text: TextNode, out: SerializedNode): void => {
  out.characters = text.characters;
  out.fontSize = typeof text.fontSize === 'number' ? text.fontSize : MIXED;
  out.fontName = isFontName(text.fontName) ? serializeFontName(text.fontName) : MIXED;
  out.textAlignHorizontal = text.textAlignHorizontal;
  out.textAlignVertical = text.textAlignVertical;
  out.lineHeight = serializeLineHeight(text.lineHeight);
  out.letterSpacing = serializeLetterSpacing(text.letterSpacing);
  out.textCase = typeof text.textCase === 'string' ? text.textCase : MIXED;
  out.textDecoration = typeof text.textDecoration === 'string' ? text.textDecoration : MIXED;
};

const writeTextLayout = (text: TextNode, out: SerializedNode): void => {
  out.textAutoResize = text.textAutoResize;
  out.textTruncation = text.textTruncation;
  out.maxLines = text.maxLines;
  if (typeof text.paragraphSpacing === 'number') out.paragraphSpacing = text.paragraphSpacing;
  if (typeof text.paragraphIndent === 'number') out.paragraphIndent = text.paragraphIndent;
};

const writeWrapAndLink = (
  wrapStyle: TextNode['textWrapStyle'],
  link: TextNode['hyperlink'],
  out: SerializedNode,
): void => {
  if (typeof wrapStyle === 'string') out.textWrapStyle = wrapStyle;
  if (link !== null && typeof link === 'object') {
    out.hyperlink = { type: link.type, value: link.value };
  }
};

const isList = (text: TextNode): boolean => {
  const characters = typeof text.characters === 'string' ? text.characters : '';
  if (!characters.includes(LINE_BREAK) || typeof text.getRangeListOptions !== 'function') {
    return false;
  }
  const options = text.getRangeListOptions(0, characters.length);
  return (
    typeof options === 'symbol' ||
    (typeof options === 'object' && options !== null && options.type !== 'NONE')
  );
};

const hasMixedStyle = (out: SerializedNode): boolean =>
  out.fontSize === MIXED ||
  out.fontName === MIXED ||
  out.fills === MIXED ||
  out.textCase === MIXED ||
  out.textDecoration === MIXED;

export const writeTextFields = (text: TextNode, out: SerializedNode): void => {
  writeTypography(text, out);
  writeTextLayout(text, out);
  const wrapStyle = text.textWrapStyle;
  const link = text.hyperlink;
  writeWrapAndLink(wrapStyle, link, out);
  const hasList = isList(text);
  const needsSegments =
    hasMixedStyle(out) || typeof link === 'symbol' || typeof wrapStyle === 'symbol' || hasList;
  if (needsSegments && typeof text.getStyledTextSegments === 'function') {
    out.segments = serializeTextSegments(text);
  }
};
