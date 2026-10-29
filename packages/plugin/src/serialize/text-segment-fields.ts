export const SEGMENT_FIELDS = [
  'fontName',
  'fontSize',
  'fills',
  'textDecoration',
  'textCase',
  'lineHeight',
  'letterSpacing',
  'hyperlink',
  'listOptions',
  'indentation',
  'textWrapStyle',
  'textStyleId',
  'fillStyleId',
  'boundVariables',
] as const;

export type SegmentField = (typeof SEGMENT_FIELDS)[number];

export const TEXT_PATH_SEGMENT_FIELDS = [
  'fontName',
  'fontSize',
  'fills',
  'textCase',
  'letterSpacing',
  'hyperlink',
  'textStyleId',
  'fillStyleId',
  'boundVariables',
] as const satisfies readonly SegmentField[];
