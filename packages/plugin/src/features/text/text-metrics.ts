import type { LetterSpacingParam, LineHeightParam } from '@figma-forge/core';

export const toFigmaLineHeight = (lineHeight: LineHeightParam): LineHeight =>
  lineHeight.unit === 'AUTO'
    ? { unit: 'AUTO' }
    : { unit: lineHeight.unit, value: lineHeight.value };

export const toFigmaLetterSpacing = (spacing: LetterSpacingParam): LetterSpacing => ({
  unit: spacing.unit,
  value: spacing.value,
});
