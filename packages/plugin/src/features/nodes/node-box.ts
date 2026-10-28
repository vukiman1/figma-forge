import type { LinearMap, Vector } from './linear-map.js';
import { mapVector } from './linear-map.js';

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PlacedNode {
  readonly absoluteTransform: Transform;
  readonly relativeTransform: Transform;
  readonly width: number;
  readonly height: number;
  x: number;
  y: number;
}

export const isPlaced = (node: BaseNode): node is SceneNode & PlacedNode =>
  'absoluteTransform' in node &&
  'relativeTransform' in node &&
  'width' in node &&
  'height' in node &&
  'x' in node;

const boxAround = (points: readonly Vector[]): Box => {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
};

export const unionOf = (boxes: readonly Box[]): Box =>
  boxAround(
    boxes.flatMap(box => [
      [box.x, box.y],
      [box.x + box.width, box.y + box.height],
    ]),
  );

export const boxInSpace = (node: PlacedNode, toSpace: LinearMap, origin: Vector): Box => {
  const t = node.absoluteTransform;
  const corners: readonly Vector[] = [
    [0, 0],
    [node.width, 0],
    [0, node.height],
    [node.width, node.height],
  ];
  return boxAround(
    corners.map(([cx, cy]) =>
      mapVector(toSpace, [
        t[0][0] * cx + t[0][1] * cy + t[0][2] - origin[0],
        t[1][0] * cx + t[1][1] * cy + t[1][2] - origin[1],
      ]),
    ),
  );
};
