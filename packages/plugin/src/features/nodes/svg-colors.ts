import { documentColorProfile, toDocumentRgb } from '../color-space.js';

const TOOL = 'import_svg';

const fromSrgb = (figmaCtx: typeof figma, color: RGB): RGB =>
  toDocumentRgb(figmaCtx, { r: color.r, g: color.g, b: color.b, space: 'SRGB' }, TOOL);

const paintFromSrgb = (figmaCtx: typeof figma, paint: Paint): Paint => {
  if (paint.type === 'SOLID') return { ...paint, color: fromSrgb(figmaCtx, paint.color) };
  if (!('gradientStops' in paint)) return paint;
  return {
    ...paint,
    gradientStops: paint.gradientStops.map(stop => ({
      ...stop,
      color: { ...fromSrgb(figmaCtx, stop.color), a: stop.color.a },
    })),
  };
};

const effectFromSrgb = (figmaCtx: typeof figma, effect: Effect): Effect =>
  effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW'
    ? { ...effect, color: { ...fromSrgb(figmaCtx, effect.color), a: effect.color.a } }
    : effect;

const nodeColorsFromSrgb = (figmaCtx: typeof figma, node: SceneNode): void => {
  if ('fills' in node && typeof node.fills !== 'symbol') {
    node.fills = node.fills.map(paint => paintFromSrgb(figmaCtx, paint));
  }
  if ('strokes' in node) node.strokes = node.strokes.map(paint => paintFromSrgb(figmaCtx, paint));
  if ('effects' in node && node.effects.length > 0) {
    node.effects = node.effects.map(effect => effectFromSrgb(figmaCtx, effect));
  }
};

export const svgColorsToDocument = (figmaCtx: typeof figma, root: FrameNode): void => {
  if (documentColorProfile(figmaCtx) !== 'DISPLAY_P3') return;
  for (const node of [root, ...root.findAll()]) nodeColorsFromSrgb(figmaCtx, node);
};
