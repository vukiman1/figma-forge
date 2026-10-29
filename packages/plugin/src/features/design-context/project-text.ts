import {
  type DesignContextNode,
  MIXED,
  pickDefined,
  type SerializedNode,
  type SerializedTextSegment,
  simplifyPaint,
} from '@figma-forge/core';

import { dropDefaults } from './drop-defaults.js';
import { cleanStyleIds } from './style-ids.js';

type Segment = NonNullable<DesignContextNode['segments']>[number];

const TEXT_FIELDS = [
  'characters',
  'fontSize',
  'fontName',
  'textCase',
  'textDecoration',
  'textAlignHorizontal',
  'textAlignVertical',
  'textTruncation',
  'paragraphSpacing',
  'paragraphIndent',
  'textWrapStyle',
  'textAutoResize',
  'hyperlink',
  'textPathStartData',
] as const satisfies readonly (keyof SerializedNode)[];

const TEXT_DEFAULTS = {
  textCase: 'ORIGINAL',
  textDecoration: 'NONE',
  textAlignHorizontal: 'LEFT',
  textAlignVertical: 'TOP',
  textTruncation: 'DISABLED',
  paragraphSpacing: 0,
  paragraphIndent: 0,
  textWrapStyle: 'AUTO',
  textAutoResize: 'WIDTH_AND_HEIGHT',
} as const;

const SEGMENT_OPTIONAL_FIELDS = [
  'lineHeight',
  'letterSpacing',
  'hyperlink',
  'listOptions',
  'indentation',
  'textWrapStyle',
  'boundVariables',
] as const satisfies readonly (keyof SerializedTextSegment)[];

const projectSegment = (segment: SerializedTextSegment): Segment => ({
  characters: segment.characters,
  start: segment.start,
  end: segment.end,
  fontName: segment.fontName,
  fontSize: segment.fontSize,
  fills: segment.fills.map(simplifyPaint),
  textDecoration: segment.textDecoration,
  textCase: segment.textCase,
  ...pickDefined(segment, SEGMENT_OPTIONAL_FIELDS),
  ...(segment.styleIds !== undefined && { styleIds: cleanStyleIds(segment.styleIds) }),
});

const spacingOf = (
  flat: SerializedNode,
): Pick<DesignContextNode, 'lineHeight' | 'letterSpacing'> => {
  const { lineHeight, letterSpacing } = flat;
  return {
    ...(lineHeight !== undefined &&
      (lineHeight === MIXED || lineHeight.unit !== 'AUTO') && { lineHeight }),
    ...(letterSpacing !== undefined &&
      (letterSpacing === MIXED || letterSpacing.value !== 0) && { letterSpacing }),
  };
};

export const projectText = (flat: SerializedNode): Partial<DesignContextNode> => ({
  ...dropDefaults(pickDefined(flat, TEXT_FIELDS), TEXT_DEFAULTS),
  ...spacingOf(flat),
  ...(typeof flat.maxLines === 'number' && { maxLines: flat.maxLines }),
  ...(flat.segments !== undefined && { segments: flat.segments.map(projectSegment) }),
});
