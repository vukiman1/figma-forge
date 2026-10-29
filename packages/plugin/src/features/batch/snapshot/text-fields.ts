export const SEGMENT_FIELDS = [
  'fontName',
  'fontSize',
  'textCase',
  'textDecoration',
  'textDecorationStyle',
  'textDecorationOffset',
  'textDecorationThickness',
  'textDecorationColor',
  'textDecorationSkipInk',
  'lineHeight',
  'letterSpacing',
  'fills',
  'listOptions',
  'listSpacing',
  'indentation',
  'paragraphIndent',
  'paragraphSpacing',
  'textWrapStyle',
  'hyperlink',
  'textStyleId',
  'fillStyleId',
  'boundVariables',
  'openTypeFeatures',
] as const;

export type SegmentField = (typeof SEGMENT_FIELDS)[number];

export const TEXT_NODE_PROPS = [
  'textAlignHorizontal',
  'textAlignVertical',
  'leadingTrim',
  'hangingPunctuation',
  'hangingList',
  'textAutoResize',
  'textTruncation',
  'maxLines',
] as const;

export const EMPTY_TEXT_PROPS = [
  'fontName',
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'textCase',
  'textDecoration',
  'paragraphSpacing',
  'paragraphIndent',
  'fills',
] as const;

export const TEXT_BINDABLE_FIELDS = [
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'paragraphSpacing',
  'paragraphIndent',
] as const satisfies readonly VariableBindableTextField[];

export const TEXT_RESTORED_FIELDS: ReadonlySet<string> = new Set([
  'characters',
  ...SEGMENT_FIELDS,
  ...TEXT_NODE_PROPS,
]);

export const RANGE_WRITERS: readonly (readonly [SegmentField, string])[] = [
  ['fontName', 'setRangeFontName'],
  ['fontSize', 'setRangeFontSize'],
  ['textCase', 'setRangeTextCase'],
  ['textDecoration', 'setRangeTextDecoration'],
  ['textDecorationStyle', 'setRangeTextDecorationStyle'],
  ['textDecorationOffset', 'setRangeTextDecorationOffset'],
  ['textDecorationThickness', 'setRangeTextDecorationThickness'],
  ['textDecorationColor', 'setRangeTextDecorationColor'],
  ['textDecorationSkipInk', 'setRangeTextDecorationSkipInk'],
  ['lineHeight', 'setRangeLineHeight'],
  ['letterSpacing', 'setRangeLetterSpacing'],
  ['fills', 'setRangeFills'],
  ['listOptions', 'setRangeListOptions'],
  ['listSpacing', 'setRangeListSpacing'],
  ['indentation', 'setRangeIndentation'],
  ['paragraphIndent', 'setRangeParagraphIndent'],
  ['paragraphSpacing', 'setRangeParagraphSpacing'],
  ['textWrapStyle', 'setRangeTextWrapStyle'],
  ['hyperlink', 'setRangeHyperlink'],
];

export const NULLABLE_DETAILS: ReadonlySet<string> = new Set([
  'textDecorationStyle',
  'textDecorationOffset',
  'textDecorationThickness',
  'textDecorationColor',
  'textDecorationSkipInk',
]);
