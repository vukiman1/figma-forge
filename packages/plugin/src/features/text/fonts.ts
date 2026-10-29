import type { FontNameParam } from '@figma-forge/core';

import type { TextLike } from './text-like.js';

const fontKey = (font: FontNameInput): string => `${font.family}\u0000${font.style ?? '*'}`;

const uniqueFonts = (fonts: readonly FontNameInput[]): FontNameInput[] => [
  ...new Map(fonts.map(font => [fontKey(font), font])).values(),
];

export const toFigmaFontName = (font: FontNameParam): FontNameInput => ({
  family: font.family,
  ...(font.style === undefined ? {} : { style: font.style }),
  ...(font.variationSettings === undefined ? {} : { variationSettings: font.variationSettings }),
});

export const fontsOf = (figmaCtx: typeof figma, text: TextLike): FontName[] => {
  if (text.fontName !== figmaCtx.mixed) return [text.fontName];
  const length = text.characters.length;
  return length > 0 ? text.getRangeAllFontNames(0, length) : [];
};

export const loadFonts = async (
  figmaCtx: typeof figma,
  fonts: readonly FontNameInput[],
): Promise<void> => {
  await Promise.all(uniqueFonts(fonts).map(async font => figmaCtx.loadFontAsync(font)));
};

export const loadTextFonts = async (
  figmaCtx: typeof figma,
  text: TextLike,
  extra: readonly FontNameInput[] = [],
): Promise<void> => loadFonts(figmaCtx, [...fontsOf(figmaCtx, text), ...extra]);

export const loadFontIfAvailable = async (
  figmaCtx: typeof figma,
  font: FontName,
): Promise<boolean> =>
  figmaCtx.loadFontAsync(font).then(
    () => true,
    () => false,
  );
