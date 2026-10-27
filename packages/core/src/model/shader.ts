import { z } from 'zod';

import { SerializedVariableAliasSchema } from './primitives.js';

const ShaderRgbaSchema = z.strictObject({
  r: z.number(),
  g: z.number(),
  b: z.number(),
  a: z.number().optional(),
});

const ShaderColorSchema = z.union([ShaderRgbaSchema, SerializedVariableAliasSchema]);

export const SerializedShaderValueSchema = z.union([
  z.boolean(),
  z.string(),
  z.number(),
  SerializedVariableAliasSchema,
  ShaderRgbaSchema,
  z.strictObject({ x: z.number(), y: z.number() }),
  z.strictObject({ x: z.number(), y: z.number(), x2: z.number(), y2: z.number() }),
  z.strictObject({ x: z.number(), y: z.number(), radius: z.number() }),
  z.strictObject({ x: z.number(), y: z.number(), radius: z.number(), angle: z.number() }),
  z.strictObject({ x: z.number(), y: z.number(), color: ShaderColorSchema }),
  z.strictObject({
    stops: z.array(z.strictObject({ position: z.number(), color: ShaderColorSchema })),
  }),
]);
export type SerializedShaderValue = z.infer<typeof SerializedShaderValueSchema>;

export const SerializedShaderPropertySchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: z.string().optional(),
  value: SerializedShaderValueSchema,
  description: z.string().optional(),
});
export type SerializedShaderProperty = z.infer<typeof SerializedShaderPropertySchema>;
