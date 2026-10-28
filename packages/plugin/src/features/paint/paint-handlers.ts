import type { HandlerFactories } from '../handler-factories.js';
import { createSetBlendModeHandler } from './set-blend-mode.handler.js';
import { createSetComplexStrokeHandler } from './set-complex-stroke.handler.js';
import { createSetCornerRadiusHandler } from './set-corner-radius.handler.js';
import { createSetEffectsHandler } from './set-effects.handler.js';
import { createSetFillsHandler } from './set-fills.handler.js';
import { createSetImageFillHandler } from './set-image-fill.handler.js';
import { createSetOpacityHandler } from './set-opacity.handler.js';
import { createSetStrokesHandler } from './set-strokes.handler.js';

export const PAINT_WRITES: HandlerFactories = {
  set_fills: createSetFillsHandler,
  set_opacity: createSetOpacityHandler,
  set_corner_radius: createSetCornerRadiusHandler,
  set_strokes: createSetStrokesHandler,
  set_blend_mode: createSetBlendModeHandler,
  set_complex_stroke: createSetComplexStrokeHandler,
  set_effects: createSetEffectsHandler,
  set_image_fill: createSetImageFillHandler,
};
