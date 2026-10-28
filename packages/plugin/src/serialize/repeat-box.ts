import { type Affine, applyToPoint, compose, invert } from '../geometry/affine.js';

export interface Box {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface RepeatChild {
  readonly width: number;
  readonly height: number;
  readonly absoluteTransform: Affine;
}

const boxOf = (m: Affine, box: Box): Box => {
  const corners = [
    applyToPoint(m, [box.minX, box.minY]),
    applyToPoint(m, [box.maxX, box.minY]),
    applyToPoint(m, [box.minX, box.maxY]),
    applyToPoint(m, [box.maxX, box.maxY]),
  ];
  return {
    minX: Math.min(...corners.map(p => p[0])),
    minY: Math.min(...corners.map(p => p[1])),
    maxX: Math.max(...corners.map(p => p[0])),
    maxY: Math.max(...corners.map(p => p[1])),
  };
};

const unionOf = (boxes: readonly Box[]): Box => ({
  minX: Math.min(...boxes.map(b => b.minX)),
  minY: Math.min(...boxes.map(b => b.minY)),
  maxX: Math.max(...boxes.map(b => b.maxX)),
  maxY: Math.max(...boxes.map(b => b.maxY)),
});

export const contentBoxOf = (
  groupTransform: Affine,
  children: readonly RepeatChild[],
): Box | undefined => {
  const toGroup = invert(groupTransform);
  if (toGroup === null) return undefined;
  return unionOf(
    children.map(child =>
      boxOf(compose(toGroup, child.absoluteTransform), {
        minX: 0,
        minY: 0,
        maxX: child.width,
        maxY: child.height,
      }),
    ),
  );
};
