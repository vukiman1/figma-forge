import { MIXED, type SerializedNode } from '@figma-forge/core';

import { isFontName, serializeFontName } from './font-name.js';
import { serializeTextSegments } from './text-segments.js';
import { serializeLetterSpacing } from './text-spacing.js';

type TextPathLink = TextPathNode['hyperlink'];

const addHyperlink = (link: TextPathLink, out: SerializedNode): void => {
  if (link !== null && typeof link !== 'symbol' && typeof link === 'object') {
    out.hyperlink = { type: link.type, value: link.value };
  }
};

const addStartData = (text: TextPathNode, out: SerializedNode): void => {
  const start = text.textPathStartData;
  if (start.segment !== 0 || start.position !== 0) {
    out.textPathStartData = { segment: start.segment, position: start.position };
  }
};

const hasMixedRuns = (out: SerializedNode, isLinkMixed: boolean): boolean =>
  out.fontSize === MIXED ||
  out.fontName === MIXED ||
  out.fills === MIXED ||
  out.textCase === MIXED ||
  out.letterSpacing === MIXED ||
  isLinkMixed;

export const serializeTextPath = (text: TextPathNode, out: SerializedNode): void => {
  out.characters = text.characters;
  out.fontSize = typeof text.fontSize === 'number' ? text.fontSize : MIXED;
  out.fontName = isFontName(text.fontName) ? serializeFontName(text.fontName) : MIXED;
  out.letterSpacing = serializeLetterSpacing(text.letterSpacing);
  out.textCase = typeof text.textCase === 'string' ? text.textCase : MIXED;
  out.textAlignHorizontal = text.textAlignHorizontal;
  out.textAlignVertical = text.textAlignVertical;
  const link = text.hyperlink;
  const isLinkMixed = typeof link === 'symbol';
  addHyperlink(link, out);
  addStartData(text, out);
  if (hasMixedRuns(out, isLinkMixed) && text.characters.length > 0) {
    out.segments = serializeTextSegments(text);
  }
};
