import { type Affine, compose, invert } from '../../draw.js';
import { outlineAnchor } from './outline-anchor.js';

const SAME_PAINTED_SIZE_TOLERANCE = 0.5;
const NEGLIGIBLE_OFFSET = 0.01;

const toTransform = ([[a, c, e], [b, d, f]]: Affine): Transform => [
  [a, c, e],
  [b, d, f],
];

const childSpaceOf = (node: SceneNode): Affine | null => {
  const relative = invert(node.relativeTransform);
  return relative === null ? null : compose(node.absoluteTransform, relative);
};

const renderBoundsOf = (node: SceneNode): Rect | null =>
  'absoluteRenderBounds' in node ? node.absoluteRenderBounds : null;

const isSameSize = (a: Rect, b: Rect): boolean =>
  Math.abs(a.width - b.width) <= SAME_PAINTED_SIZE_TOLERANCE &&
  Math.abs(a.height - b.height) <= SAME_PAINTED_SIZE_TOLERANCE;

const alignPaint = (source: SceneNode, outline: SceneNode, back: Affine): void => {
  const want = renderBoundsOf(source);
  const got = renderBoundsOf(outline);
  if (want === null || got === null || !isSameSize(want, got)) return;
  const dx = want.x - got.x;
  const dy = want.y - got.y;
  if (Math.abs(dx) < NEGLIGIBLE_OFFSET && Math.abs(dy) < NEGLIGIBLE_OFFSET) return;
  const [[a, c, e], [b, d, f]] = outline.relativeTransform;
  outline.relativeTransform = [
    [a, c, e + back[0][0] * dx + back[0][1] * dy],
    [b, d, f + back[1][0] * dx + back[1][1] * dy],
  ];
};

const drawnTransformOf = (source: SceneNode, outline: SceneNode): Affine => {
  const from = source.parent;
  return from !== null && 'absoluteTransform' in from
    ? compose(from.absoluteTransform, outline.relativeTransform)
    : outline.relativeTransform;
};

const insertAbove = (anchor: SceneNode, outline: SceneNode): boolean => {
  const parent = anchor.parent;
  if (parent === null) return false;
  if ('targetAspectRatio' in outline && outline.targetAspectRatio !== null) {
    outline.unlockAspectRatio();
  }
  parent.insertChild(parent.children.indexOf(anchor) + 1, outline);
  if ('layoutMode' in parent && parent.layoutMode !== 'NONE' && 'layoutPositioning' in outline) {
    outline.layoutPositioning = 'ABSOLUTE';
  }
  return true;
};

export const placeOutline = (source: SceneNode, outline: SceneNode): void => {
  const drawn = drawnTransformOf(source, outline);
  if (!insertAbove(outlineAnchor(source), outline)) return;
  const space = childSpaceOf(outline);
  const back = space === null ? null : invert(space);
  if (back === null) return;
  outline.relativeTransform = toTransform(compose(back, drawn));
  alignPaint(source, outline, back);
};
