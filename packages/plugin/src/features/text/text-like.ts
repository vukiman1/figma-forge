export type TextLike = TextNode | TextPathNode;

export const isTextLike = (node: BaseNode | null): node is TextLike =>
  node?.type === 'TEXT' || node?.type === 'TEXT_PATH';

export const NOT_ON_A_PATH: ReadonlySet<string> = new Set([
  'lineHeight',
  'textDecoration',
  'textDecorationStyle',
  'textDecorationOffset',
  'textDecorationThickness',
  'textDecorationColor',
  'textDecorationSkipInk',
  'paragraphSpacing',
  'paragraphIndent',
  'listOptions',
  'listSpacing',
  'indentation',
  'textWrapStyle',
  'textAutoResize',
  'textTruncation',
  'maxLines',
  'leadingTrim',
  'hangingPunctuation',
  'hangingList',
]);

export const unsupportedOnPath = (params: object): string[] =>
  Object.entries(params)
    .filter(([field, value]) => NOT_ON_A_PATH.has(field) && value !== undefined)
    .map(([field]) => field);

export const requireTextLike = async (
  figmaCtx: typeof figma,
  tool: string,
  nodeId: string,
): Promise<TextLike> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (!isTextLike(node))
    throw new Error(`${tool}: node ${nodeId} is not a TEXT node or text on a path`);
  return node;
};
