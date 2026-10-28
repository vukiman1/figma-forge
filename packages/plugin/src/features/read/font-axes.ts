const axesOrNull = (figmaCtx: typeof figma, family: string): string[] | null => {
  try {
    const axes = figmaCtx.getFontFamilyVariationAxes(family);
    return axes !== null && axes.length > 0 ? [...axes] : null;
  } catch {
    return null;
  }
};

export const variationAxesOf = (
  figmaCtx: typeof figma,
  families: Iterable<string>,
): Record<string, string[]> | null => {
  if (typeof figmaCtx.getFontFamilyVariationAxes !== 'function') return null;
  const entries = [...new Set(families)].flatMap(family => {
    const axes = axesOrNull(figmaCtx, family);
    return axes === null ? [] : [[family, axes] as const];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : null;
};
