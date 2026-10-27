export const PATH_SOURCE_TYPES: ReadonlySet<string> = new Set([
  'VECTOR',
  'LINE',
  'RECTANGLE',
  'ELLIPSE',
  'POLYGON',
  'STAR',
]);

export type PathSource =
  | VectorNode
  | LineNode
  | RectangleNode
  | EllipseNode
  | PolygonNode
  | StarNode;

export const isPathSource = (node: BaseNode | null): node is PathSource =>
  node !== null && PATH_SOURCE_TYPES.has(node.type);

export const createTextPathOn = (
  figmaCtx: typeof figma,
  source: PathSource,
  segment: number,
  position: number,
): TextPathNode =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Figma accepts any shape here, though its typings name only VectorNode
  figmaCtx.createTextPath(source as unknown as VectorNode, segment, position);

export const segmentCountOf = (figmaCtx: typeof figma, node: PathSource): number => {
  if (node.type === 'VECTOR') return node.vectorNetwork.segments.length;
  const probe = createTextPathOn(figmaCtx, node.clone(), 0, 0);
  const count = probe.vectorNetwork.segments.length;
  probe.remove();
  return count;
};

export const segmentOutOfRange = (
  tool: string,
  nodeId: string,
  segment: number,
  count: number,
  fallback: string,
): RangeError =>
  new RangeError(
    `${tool}: ${nodeId}'s path has ${count} segment${count === 1 ? '' : 's'} (0–${count - 1}), ` +
      `so startSegment ${segment} does not exist — Figma would silently ${fallback}`,
  );
