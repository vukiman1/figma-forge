import { z } from 'zod';

import { boundVariablesSchema } from '../shared/binding-schema.js';
import { colorSpaceSchema } from '../shared/color-space-schema.js';

const rgb = z.object({
  r: z.number(),
  g: z.number(),
  b: z.number(),
  space: colorSpaceSchema.optional(),
});
const rgba = z.object({
  r: z.number(),
  g: z.number(),
  b: z.number(),
  a: z.number(),
  space: colorSpaceSchema.optional(),
});

export const paintItemSchema = z
  .object({
    type: z.enum([
      'SOLID',
      'GRADIENT_LINEAR',
      'GRADIENT_RADIAL',
      'GRADIENT_ANGULAR',
      'GRADIENT_DIAMOND',
    ]),
    color: rgb.describe('SOLID color (r/g/b in 0–1)').optional(),
    gradientStops: z
      .array(
        z.object({
          position: z.number(),
          color: rgba,
          boundVariables: boundVariablesSchema.optional(),
        }),
      )
      .describe('Gradient stops (position 0–1 + RGBA color); required for gradient types')
      .optional(),
    gradientTransform: z
      .array(z.array(z.number()))
      .describe('2×3 affine matrix (two rows of three) positioning the gradient')
      .optional(),
    opacity: z.number().optional(),
    visible: z.boolean().optional(),
    boundVariables: boundVariablesSchema
      .describe(
        'SOLID only: { "color": variableId } binds the paint colour to a COLOR variable, whose ' +
          'alpha then replaces opacity.',
      )
      .optional(),
  })
  .loose();

export const fillPaintItemSchema = paintItemSchema
  .extend({
    type: z.enum([
      'SOLID',
      'GRADIENT_LINEAR',
      'GRADIENT_RADIAL',
      'GRADIENT_ANGULAR',
      'GRADIENT_DIAMOND',
      'PATTERN',
    ]),
    sourceNodeId: z
      .string()
      .describe('PATTERN: the node whose artwork is tiled (any layer in the file)')
      .optional(),
    tileType: z
      .enum(['RECTANGULAR', 'HORIZONTAL_HEXAGONAL', 'VERTICAL_HEXAGONAL'])
      .describe('PATTERN: a plain grid, or rows / columns offset by half a tile')
      .optional(),
    scalingFactor: z
      .number()
      .positive()
      .describe('PATTERN: the tile’s size as a multiple of the source node’s (default 1)')
      .optional(),
    spacing: z
      .object({ x: z.number(), y: z.number() })
      .describe('PATTERN: the gap between tiles as a fraction of the tile’s size (default 0, 0)')
      .optional(),
    horizontalAlignment: z
      .enum(['START', 'CENTER', 'END'])
      .describe('PATTERN: where the tiling is anchored horizontally (default START)')
      .optional(),
    verticalAlignment: z
      .enum(['START', 'CENTER', 'END'])
      .describe('PATTERN: where the tiling is anchored vertically (default START)')
      .optional(),
  })
  .loose();
