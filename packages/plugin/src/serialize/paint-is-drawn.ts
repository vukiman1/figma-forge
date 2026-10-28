import type { SerializedPaint } from '@figma-forge/core';

export const paintIsDrawn = (paint: SerializedPaint): boolean => {
  if (!paint.visible || paint.opacity <= 0) return false;
  if ('gradientStops' in paint && Array.isArray(paint.gradientStops)) {
    return paint.gradientStops.some(stop => stop.color.a > 0);
  }
  return true;
};
