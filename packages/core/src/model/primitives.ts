import { z } from 'zod';

export const MIXED = 'mixed' as const;
export type Mixed = typeof MIXED;

export const DisplayP3MarkerSchema = z.literal('DISPLAY_P3');

export const Vector2Schema = z.object({ x: z.number(), y: z.number() });

export const SerializedColorSchema = z.object({ r: z.number(), g: z.number(), b: z.number() });
export type SerializedColor = z.infer<typeof SerializedColorSchema>;

export const SerializedRGBASchema = SerializedColorSchema.extend({ a: z.number() });
export type SerializedRGBA = z.infer<typeof SerializedRGBASchema>;

export const SerializedBindingsSchema = z.record(z.string(), z.string());
export type SerializedBindings = z.infer<typeof SerializedBindingsSchema>;

export const SerializedVariableAliasSchema = z.object({
  type: z.literal('VARIABLE_ALIAS'),
  id: z.string(),
});
export type SerializedVariableAlias = z.infer<typeof SerializedVariableAliasSchema>;

export const SerializedBoundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
export type SerializedBounds = z.infer<typeof SerializedBoundsSchema>;

export const SerializedStyleIdsSchema = z.object({
  fill: z.string().optional(),
  stroke: z.string().optional(),
  effect: z.string().optional(),
  text: z.string().optional(),
});
export type SerializedStyleIds = z.infer<typeof SerializedStyleIdsSchema>;

export const optionalOrMixed = <T extends z.ZodType>(schema: T) =>
  z.union([schema, z.literal(MIXED)]).optional();
