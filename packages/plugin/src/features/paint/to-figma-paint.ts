import type { FillPaintInput } from '@figma-forge/core';

import { toDocumentRgb, toDocumentRgba } from '../color-space.js';

type GradientType = GradientPaint['type'];

const AFFINE_ROWS = 2;

const visibility = (paint: FillPaintInput) => ({
  ...(paint.opacity === undefined ? {} : { opacity: paint.opacity }),
  ...(paint.visible === undefined ? {} : { visible: paint.visible }),
});

const toSolid = (figmaCtx: typeof figma, paint: FillPaintInput): SolidPaint => {
  if (paint.color === undefined) throw new TypeError('SOLID: color is required');
  return {
    type: 'SOLID',
    color: toDocumentRgb(figmaCtx, paint.color, 'SOLID'),
    ...visibility(paint),
  };
};

const toTransform = (rows: number[][] | undefined, type: GradientType): Transform => {
  const [first, second] = rows ?? [];
  if (rows?.length !== AFFINE_ROWS || first?.length !== 3 || second?.length !== 3) {
    throw new TypeError(`${type}: gradientTransform must be a 2×3 matrix`);
  }
  return [
    [first[0] ?? 0, first[1] ?? 0, first[2] ?? 0],
    [second[0] ?? 0, second[1] ?? 0, second[2] ?? 0],
  ];
};

const toGradient = (
  figmaCtx: typeof figma,
  paint: FillPaintInput,
  type: GradientType,
): GradientPaint => {
  const stops = paint.gradientStops ?? [];
  if (stops.length === 0) throw new TypeError(`${type}: gradientStops must be a non-empty array`);
  return {
    type,
    gradientStops: stops.map(stop => ({
      position: stop.position,
      color: toDocumentRgba(figmaCtx, stop.color, type),
    })),
    gradientTransform: toTransform(paint.gradientTransform, type),
    ...visibility(paint),
  };
};

const toPattern = (paint: FillPaintInput): PatternPaint => {
  if (paint.sourceNodeId === undefined) {
    throw new TypeError('PATTERN: sourceNodeId (the layer to tile) is required');
  }
  const pattern = {
    type: 'PATTERN' as const,
    sourceNodeId: paint.sourceNodeId,
    tileType: paint.tileType ?? 'RECTANGULAR',
    scalingFactor: paint.scalingFactor ?? 1,
    spacing: paint.spacing ?? { x: 0, y: 0 },
    horizontalAlignment: paint.horizontalAlignment ?? 'START',
    verticalAlignment: paint.verticalAlignment ?? 'START',
    ...visibility(paint),
  };
  return pattern;
};

export const toFigmaPaint = (paint: FillPaintInput, figmaCtx: typeof figma): Paint => {
  if (paint.type === 'SOLID') return toSolid(figmaCtx, paint);
  if (paint.type === 'PATTERN') return toPattern(paint);
  return toGradient(figmaCtx, paint, paint.type);
};
