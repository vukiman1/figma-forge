import type { SerializedColorStop, SerializedPaint } from '@figma-forge/core';

import { cssAngleFromGradientTransform } from '../geometry/gradient-angle.js';
import { collectBindings } from './bindings.js';
import type { PaintOwnerSize, PaintVisibility } from './paint-types.js';

const IDENTITY_GRADIENT_TRANSFORM: Transform = [
  [1, 0, 0],
  [0, 1, 0],
];

export const isGradient = (paint: Paint): paint is GradientPaint =>
  paint.type === 'GRADIENT_LINEAR' ||
  paint.type === 'GRADIENT_RADIAL' ||
  paint.type === 'GRADIENT_ANGULAR' ||
  paint.type === 'GRADIENT_DIAMOND';

const serializeColorStop = (colorStop: ColorStop): SerializedColorStop => {
  const { r, g, b, a } = colorStop.color;
  const stop: SerializedColorStop = { position: colorStop.position, color: { r, g, b, a } };
  const bound = collectBindings(colorStop.boundVariables);
  if (bound !== undefined) stop.boundVariables = bound;
  return stop;
};

export const serializeGradient = (
  paint: GradientPaint,
  ownerSize: PaintOwnerSize | null,
  { visible, opacity }: PaintVisibility,
): SerializedPaint => {
  const stops = paint.gradientStops ?? [];
  const transform = paint.gradientTransform ?? IDENTITY_GRADIENT_TRANSFORM;
  const cssAngle =
    paint.type === 'GRADIENT_LINEAR' && ownerSize !== null
      ? cssAngleFromGradientTransform(transform, ownerSize.width, ownerSize.height)
      : undefined;
  return {
    type: paint.type,
    visible,
    opacity,
    ...(cssAngle === undefined ? {} : { cssAngle }),
    gradientStops: stops.map(serializeColorStop),
    gradientTransform: transform.map(row => row.slice()),
  };
};
