import { MIXED, type SerializedLetterSpacing, type SerializedLineHeight } from '@figma-forge/core';

type MeasuredUnit = 'PIXELS' | 'PERCENT';

const isMeasuredUnit = (unit: unknown): unit is MeasuredUnit =>
  unit === 'PIXELS' || unit === 'PERCENT';

export const serializeLineHeight = (lh: unknown): SerializedLineHeight | typeof MIXED => {
  if (typeof lh !== 'object' || lh === null) return MIXED;
  const unit: unknown = Reflect.get(lh, 'unit');
  const value: unknown = Reflect.get(lh, 'value');
  if (unit === 'AUTO') return { unit: 'AUTO' };
  if (isMeasuredUnit(unit) && typeof value === 'number') return { value, unit };
  return MIXED;
};

export const serializeLetterSpacing = (ls: unknown): SerializedLetterSpacing | typeof MIXED => {
  if (typeof ls !== 'object' || ls === null) return MIXED;
  const unit: unknown = Reflect.get(ls, 'unit');
  const value: unknown = Reflect.get(ls, 'value');
  if (isMeasuredUnit(unit) && typeof value === 'number') return { value, unit };
  return MIXED;
};
