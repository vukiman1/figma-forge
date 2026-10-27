const COLOR_SPACES = ['SRGB', 'DISPLAY_P3'] as const;

type ColorSpace = (typeof COLOR_SPACES)[number];

export interface WireColor {
  r: number;
  g: number;
  b: number;
  space?: unknown;
}

const isColorSpace = (value: unknown): value is ColorSpace =>
  COLOR_SPACES.some(space => space === value);

export const documentColorProfile = (figmaCtx: typeof figma): string | undefined => {
  const root: unknown = Reflect.get(figmaCtx, 'root');
  if (typeof root !== 'object' || root === null) return undefined;
  const profile: unknown = Reflect.get(root, 'documentColorProfile');
  return typeof profile === 'string' ? profile : undefined;
};

export const displayP3Marker = (figmaCtx: typeof figma): { colorProfile?: 'DISPLAY_P3' } =>
  documentColorProfile(figmaCtx) === 'DISPLAY_P3' ? { colorProfile: 'DISPLAY_P3' } : {};

const documentSpace = (figmaCtx: typeof figma): ColorSpace =>
  documentColorProfile(figmaCtx) === 'DISPLAY_P3' ? 'DISPLAY_P3' : 'SRGB';

export const toDocumentRgb = (figmaCtx: typeof figma, color: WireColor, where: string): RGB => {
  const { r, g, b, space } = color;
  if (space === undefined) return { r, g, b };
  if (!isColorSpace(space)) {
    throw new TypeError(
      `${where}: color space must be one of ${COLOR_SPACES.join(' / ')} — got ${typeof space === 'string' ? space : JSON.stringify(space)}`,
    );
  }
  if (space === documentSpace(figmaCtx)) return { r, g, b };
  return figmaCtx.util.rgb({ space, r, g, b });
};

export const toDocumentChannels = (
  figmaCtx: typeof figma,
  color: WireColor,
  where: string,
): RGB => {
  const { r, g, b } = toDocumentRgb(figmaCtx, color, where);
  return { r, g, b };
};

export const toDocumentRgba = (
  figmaCtx: typeof figma,
  color: WireColor & { a: number },
  where: string,
): RGBA => ({ ...toDocumentRgb(figmaCtx, color, where), a: color.a });
