import { z } from 'zod';

import { SerializedBindingsSchema, SerializedRGBASchema, Vector2Schema } from './primitives.js';
import { SerializedShaderPropertySchema } from './shader.js';

export const SerializedEffectSchema = z.object({
  type: z.string(),
  visible: z.boolean(),
  radius: z.number().optional(),
  color: SerializedRGBASchema.optional(),
  offset: Vector2Schema.optional(),
  spread: z.number().optional(),
  boundVariables: SerializedBindingsSchema.optional(),
  shaderId: z.string().optional(),
  shaderProperties: z.array(SerializedShaderPropertySchema).optional(),
  noiseType: z.enum(['MONOTONE', 'DUOTONE', 'MULTITONE']).optional(),
  noiseSizeVector: Vector2Schema.optional(),
  density: z.number().optional(),
  secondaryColor: SerializedRGBASchema.optional(),
  opacity: z.number().optional(),
  showShadowBehindNode: z.literal(true).optional(),
  blendMode: z.string().optional(),
  clipToShape: z.boolean().optional(),
  lightIntensity: z.number().optional(),
  lightAngle: z.number().optional(),
  refraction: z.number().optional(),
  depth: z.number().optional(),
  dispersion: z.number().optional(),
  splay: z.number().optional(),
  blurType: z.literal('PROGRESSIVE').optional(),
  startRadius: z.number().optional(),
  startOffset: Vector2Schema.optional(),
  endOffset: Vector2Schema.optional(),
  cssLayers: z.array(z.string()).optional(),
  drawn: z.literal(false).optional(),
});
export type SerializedEffect = z.infer<typeof SerializedEffectSchema>;
