import { z } from 'zod';

import { boundVariablesSchema } from '../shared/binding-schema.js';
import { colorSpaceSchema } from '../shared/color-space-schema.js';

const rgba = z.object({
  r: z.number(),
  g: z.number(),
  b: z.number(),
  a: z.number(),
  space: colorSpaceSchema.optional(),
});

export const effectItemSchema = z
  .object({
    type: z.enum(['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR']),
    visible: z.boolean(),
    radius: z
      .number()
      .describe(
        "Figma's radius, not a CSS length: a CSS blur(σ) is radius σ ÷ 0.43, and a box-shadow blur " +
          'B is radius B ÷ 0.85 (measured).',
      )
      .optional(),
    color: rgba.describe('Shadow color (RGBA 0–1). Required for shadows.').optional(),
    offset: z
      .object({ x: z.number(), y: z.number() })
      .describe('Shadow offset in px. Required for shadows.')
      .optional(),
    spread: z.number().optional(),
    showShadowBehindNode: z
      .boolean()
      .describe(
        "DROP_SHADOW only: also draw the shadow through the node's translucent areas. Omit for false, " +
          'which is what a CSS box-shadow draws; a shadow read from Figma carries it only when true.',
      )
      .optional(),
    blendMode: z
      .string()
      .describe(
        'Shadows only: the blend mode the shadow is composited with, e.g. "MULTIPLY". Omit for NORMAL.',
      )
      .optional(),
    boundVariables: boundVariablesSchema
      .describe(
        'Bindable fields: color (COLOR variable) and radius / spread / offsetX / offsetY (FLOAT).',
      )
      .optional(),
  })
  .loose();
