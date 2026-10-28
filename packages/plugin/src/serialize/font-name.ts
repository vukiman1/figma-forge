import type { SerializedFontName } from '@figma-forge/core';

export const isFontName = (value: unknown): value is FontName =>
  typeof value === 'object' && value !== null && 'family' in value && 'style' in value;

export const serializeFontName = (font: FontName): SerializedFontName => {
  const out: SerializedFontName = { family: font.family, style: font.style };
  if (font.variationSettings !== undefined) out.variationSettings = { ...font.variationSettings };
  return out;
};
