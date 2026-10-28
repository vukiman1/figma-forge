import type { SerializedBounds } from '@figma-forge/core';

import { round2 } from './rounding.js';

const MIN_OVERHANG_PX = 0.5;

interface Point {
  readonly x: number;
  readonly y: number;
}

const largestOverhang = (render: Rect, box: Rect): number => {
  const dx = render.x - box.x;
  const dy = render.y - box.y;
  const dr = render.x + render.width - (box.x + box.width);
  const db = render.y + render.height - (box.y + box.height);
  return Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dr), Math.abs(db));
};

export const renderBoundsOf = (
  render: Rect | null | undefined,
  box: Rect | null | undefined,
  origin: Point | undefined = box ?? undefined,
): SerializedBounds | undefined => {
  if (render == null || box == null || origin === undefined) return undefined;
  if (largestOverhang(render, box) < MIN_OVERHANG_PX) return undefined;
  return {
    x: round2(render.x - origin.x),
    y: round2(render.y - origin.y),
    width: round2(render.width),
    height: round2(render.height),
  };
};
