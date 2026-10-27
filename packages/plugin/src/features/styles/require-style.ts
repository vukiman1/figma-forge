type StyleOfType = {
  PAINT: PaintStyle;
  TEXT: TextStyle;
  EFFECT: EffectStyle;
  GRID: GridStyle;
};

const KIND_LABEL: Record<keyof StyleOfType, string> = {
  PAINT: 'paint',
  TEXT: 'text',
  EFFECT: 'effect',
  GRID: 'grid',
};

const isStyleOf = <K extends keyof StyleOfType>(
  style: BaseStyle | null,
  type: K,
): style is StyleOfType[K] => style?.type === type;

export const requireStyle = async (
  figmaCtx: typeof figma,
  tool: string,
  styleId: string,
): Promise<BaseStyle> => {
  const style = await figmaCtx.getStyleByIdAsync(styleId);
  if (style === null) throw new Error(`${tool}: style ${styleId} not found`);
  return style;
};

export const requireStyleOf = async <K extends keyof StyleOfType>(
  figmaCtx: typeof figma,
  tool: string,
  styleId: string,
  type: K,
): Promise<StyleOfType[K]> => {
  const style = await figmaCtx.getStyleByIdAsync(styleId);
  if (isStyleOf(style, type)) return style;
  throw new Error(`${tool}: ${KIND_LABEL[type]} style ${styleId} not found`);
};
