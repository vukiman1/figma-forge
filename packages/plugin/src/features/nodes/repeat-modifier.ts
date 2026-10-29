import type { RepeatModifierInput } from '@figma-forge/core';

export const toFigmaModifier = ({
  repeatType,
  count,
  offset,
  unitType = 'PIXELS',
  axis = 'HORIZONTAL',
}: RepeatModifierInput): TransformModifier =>
  repeatType === 'RADIAL'
    ? { type: 'REPEAT', repeatType, unitType, offset, count }
    : { type: 'REPEAT', repeatType, unitType, offset, count, axis };
