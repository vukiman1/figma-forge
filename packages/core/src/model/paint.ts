import { z } from 'zod';

import {
  SerializedBindingsSchema,
  SerializedColorSchema,
  SerializedRGBASchema,
  Vector2Schema,
} from './primitives.js';
import { SerializedShaderPropertySchema } from './shader.js';

const paintBaseFields = { visible: z.boolean(), opacity: z.number() };

const ALIGNMENT = z.enum(['START', 'CENTER', 'END']);

export const SerializedColorStopSchema = z.object({
  position: z.number(),
  color: SerializedRGBASchema,
  boundVariables: SerializedBindingsSchema.optional(),
});
export type SerializedColorStop = z.infer<typeof SerializedColorStopSchema>;

const SolidPaintSchema = z.object({
  type: z.literal('SOLID'),
  ...paintBaseFields,
  color: SerializedColorSchema,
  boundVariables: SerializedBindingsSchema.optional(),
});

const GradientPaintSchema = z.object({
  type: z.enum(['GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND']),
  ...paintBaseFields,
  gradientStops: z.array(SerializedColorStopSchema),
  gradientTransform: z.array(z.array(z.number())),
  cssAngle: z.number().optional(),
});

const MediaPaintSchema = z.object({
  type: z.enum(['IMAGE', 'VIDEO']),
  ...paintBaseFields,
  scaleMode: z.enum(['FILL', 'FIT', 'CROP', 'TILE']).optional(),
  imageTransform: z.array(z.array(z.number())).optional(),
  cssTransform: z.string().optional(),
  filtersApplied: z.boolean().optional(),
});

const PatternPaintSchema = z.object({
  type: z.literal('PATTERN'),
  ...paintBaseFields,
  sourceNodeId: z.string(),
  tileType: z.enum(['RECTANGULAR', 'HORIZONTAL_HEXAGONAL', 'VERTICAL_HEXAGONAL']),
  scalingFactor: z.number(),
  spacing: Vector2Schema.optional(),
  horizontalAlignment: ALIGNMENT.optional(),
  verticalAlignment: ALIGNMENT.optional(),
});

const ShaderPaintSchema = z.object({
  type: z.literal('SHADER'),
  ...paintBaseFields,
  shaderId: z.string(),
  shaderProperties: z.array(SerializedShaderPropertySchema).optional(),
});

export const SerializedPaintSchema = z.discriminatedUnion('type', [
  SolidPaintSchema,
  GradientPaintSchema,
  MediaPaintSchema,
  PatternPaintSchema,
  ShaderPaintSchema,
]);
export type SerializedPaint = z.infer<typeof SerializedPaintSchema>;
export type SerializedGradientPaint = z.infer<typeof GradientPaintSchema>;
export type SerializedMediaPaint = z.infer<typeof MediaPaintSchema>;
export type SerializedPatternPaint = z.infer<typeof PatternPaintSchema>;
