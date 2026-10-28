import type { SerializedPaint } from '@figma-forge/core';

import type { PaintVisibility } from './paint-types.js';

type PatternAlignment = 'START' | 'CENTER' | 'END';

interface PatternVerticalAlignment {
  readonly type: 'PATTERN';
  readonly verticalAlignment?: PatternAlignment;
}

const verticalAlignmentOf = (paint: PatternVerticalAlignment): PatternAlignment | undefined =>
  paint.verticalAlignment;

export const serializePattern = (
  paint: PatternPaint,
  { visible, opacity }: PaintVisibility,
): SerializedPaint => {
  const spacing =
    paint.spacing.x !== 0 || paint.spacing.y !== 0
      ? { spacing: { x: paint.spacing.x, y: paint.spacing.y } }
      : undefined;
  const alignment =
    paint.horizontalAlignment !== 'START'
      ? { horizontalAlignment: paint.horizontalAlignment }
      : undefined;
  const vertical = verticalAlignmentOf(paint);
  const verticalAlignment =
    vertical === 'CENTER' || vertical === 'END' ? { verticalAlignment: vertical } : undefined;
  return {
    type: 'PATTERN',
    visible,
    opacity,
    sourceNodeId: paint.sourceNodeId,
    tileType: paint.tileType,
    scalingFactor: paint.scalingFactor,
    ...spacing,
    ...alignment,
    ...verticalAlignment,
  };
};
