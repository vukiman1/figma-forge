import type { SerializedComplexStroke, SerializedVariableWidthStroke } from '@figma-forge/core';

import { fieldOf } from './field-of.js';
import { round4 } from './rounding.js';

interface WidthPoint {
  readonly position: number;
  readonly width: number;
}

const COMPLEX_FIELDS = [
  'brushType',
  'brushName',
  'direction',
  'gap',
  'wiggle',
  'sizeJitter',
  'angularJitter',
  'rotation',
  'frequency',
  'smoothen',
] as const;

const UNIFORM_WIDTH = 'UNIFORM';

const isWidthPoint = (point: unknown): point is WidthPoint =>
  typeof fieldOf(point, 'position') === 'number' && typeof fieldOf(point, 'width') === 'number';

export const serializeComplexStroke = (raw: unknown): SerializedComplexStroke | undefined => {
  const type = fieldOf(raw, 'type');
  if (type !== 'BRUSH' && type !== 'DYNAMIC') return undefined;
  const out: Record<string, unknown> = { type };
  for (const field of COMPLEX_FIELDS) {
    const value = fieldOf(raw, field);
    if (typeof value === 'number') out[field] = round4(value);
    else if (typeof value === 'string') out[field] = value;
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the fields are copied from Figma's ComplexStrokeProperties, which the wire schema mirrors
  return out as SerializedComplexStroke;
};

export const serializeVariableWidthStroke = (
  raw: unknown,
): SerializedVariableWidthStroke | undefined => {
  const widthProfile = fieldOf(raw, 'widthProfile');
  if (typeof widthProfile !== 'string' || widthProfile === UNIFORM_WIDTH) return undefined;
  const rawPoints = fieldOf(raw, 'variableWidthPoints');
  const points: readonly unknown[] = Array.isArray(rawPoints) ? rawPoints : [];
  return {
    widthProfile,
    variableWidthPoints: points
      .filter(isWidthPoint)
      .map(p => ({ position: round4(p.position), width: round4(p.width) })),
  };
};
