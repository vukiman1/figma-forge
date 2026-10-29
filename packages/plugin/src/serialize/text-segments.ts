import { MIXED, type SerializedStyleIds, type SerializedTextSegment } from '@figma-forge/core';

import { serializeFontName } from './font-name.js';
import { type PaintOwnerSize, serializePaint } from './paint.js';
import { collectBoundVariables } from './style-links.js';
import {
  SEGMENT_FIELDS,
  type SegmentField,
  TEXT_PATH_SEGMENT_FIELDS,
} from './text-segment-fields.js';
import { serializeLetterSpacing, serializeLineHeight } from './text-spacing.js';

type Segment = Pick<StyledTextSegment, SegmentField | 'characters' | 'start' | 'end'>;

const addSpacing = (segment: Segment, out: SerializedTextSegment): void => {
  const lineHeight = serializeLineHeight(segment.lineHeight);
  if (lineHeight !== MIXED && lineHeight.unit !== 'AUTO') out.lineHeight = lineHeight;
  const letterSpacing = serializeLetterSpacing(segment.letterSpacing);
  if (letterSpacing !== MIXED && letterSpacing.value !== 0) out.letterSpacing = letterSpacing;
};

const addStructure = (segment: Segment, out: SerializedTextSegment): void => {
  const { hyperlink, listOptions, indentation, textWrapStyle } = segment;
  if (hyperlink != null) out.hyperlink = { type: hyperlink.type, value: hyperlink.value };
  if (listOptions != null && listOptions.type !== 'NONE') out.listOptions = listOptions.type;
  if (typeof indentation === 'number' && indentation > 0) out.indentation = indentation;
  if (typeof textWrapStyle === 'string' && textWrapStyle !== 'AUTO') {
    out.textWrapStyle = textWrapStyle;
  }
};

const addStyleLinks = (segment: Segment, out: SerializedTextSegment): void => {
  const styleIds: SerializedStyleIds = {};
  const { fillStyleId, textStyleId } = segment;
  if (typeof fillStyleId === 'string' && fillStyleId !== '') styleIds.fill = fillStyleId;
  if (typeof textStyleId === 'string' && textStyleId !== '') styleIds.text = textStyleId;
  if (Object.keys(styleIds).length > 0) out.styleIds = styleIds;
  const bound = collectBoundVariables(segment.boundVariables);
  if (bound !== undefined) out.boundVariables = bound;
};

const serializeSegment = (segment: Segment, ownerSize: PaintOwnerSize): SerializedTextSegment => {
  const out: SerializedTextSegment = {
    characters: segment.characters,
    start: segment.start,
    end: segment.end,
    fontName: serializeFontName(segment.fontName),
    fontSize: segment.fontSize,
    fills: Array.isArray(segment.fills)
      ? segment.fills.map(paint => serializePaint(paint, ownerSize))
      : [],
    textDecoration: segment.textDecoration ?? 'NONE',
    textCase: segment.textCase,
  };
  addSpacing(segment, out);
  addStructure(segment, out);
  addStyleLinks(segment, out);
  return out;
};

const fieldsFor = (text: TextNode | TextPathNode): SegmentField[] =>
  text.type === 'TEXT_PATH' ? [...TEXT_PATH_SEGMENT_FIELDS] : [...SEGMENT_FIELDS];

export const serializeTextSegments = (text: TextNode | TextPathNode): SerializedTextSegment[] => {
  const segments = text.getStyledTextSegments(fieldsFor(text));
  const ownerSize: PaintOwnerSize = { width: text.width, height: text.height };
  return segments.map(segment => serializeSegment(segment, ownerSize));
};
