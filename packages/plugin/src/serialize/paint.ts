import type { SerializedPaint } from '@figma-forge/core';

import { collectBindings } from './bindings.js';
import { isGradient, serializeGradient } from './paint-gradient.js';
import { serializeMedia } from './paint-media.js';
import { serializePattern } from './paint-pattern.js';
import type { PaintOwnerSize, PaintVisibility } from './paint-types.js';
import { serializeShader } from './shader.js';

export type { PaintOwnerSize } from './paint-types.js';

const serializeSolid = (
  paint: SolidPaint,
  { visible, opacity }: PaintVisibility,
): SerializedPaint => {
  const bound = collectBindings(paint.boundVariables);
  return {
    type: 'SOLID',
    visible,
    opacity,
    color: { r: paint.color.r, g: paint.color.g, b: paint.color.b },
    ...(bound === undefined ? {} : { boundVariables: bound }),
  };
};

export const serializePaint = (paint: Paint, ownerSize: PaintOwnerSize | null): SerializedPaint => {
  const visibility: PaintVisibility = {
    visible: paint.visible ?? true,
    opacity: paint.opacity ?? 1,
  };
  if (paint.type === 'SOLID') return serializeSolid(paint, visibility);
  if (isGradient(paint)) return serializeGradient(paint, ownerSize, visibility);
  if (paint.type === 'PATTERN') return serializePattern(paint, visibility);
  if (paint.type === 'SHADER') {
    return { type: 'SHADER', ...visibility, ...serializeShader(paint) };
  }
  return serializeMedia(paint, ownerSize, visibility);
};
