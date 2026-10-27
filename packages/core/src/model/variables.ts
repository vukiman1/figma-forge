import { z } from 'zod';

import {
  DisplayP3MarkerSchema,
  SerializedRGBASchema,
  SerializedVariableAliasSchema,
} from './primitives.js';

export const SerializedVariableColorSchema = SerializedRGBASchema.extend({
  hex: z.string().optional(),
});
export type SerializedVariableColor = z.infer<typeof SerializedVariableColorSchema>;

export const SerializedVariableComposedColorSchema = z.object({
  color: z.union([SerializedVariableColorSchema, SerializedVariableAliasSchema]),
  opacity: z.union([z.number(), SerializedVariableAliasSchema]),
});
export type SerializedVariableComposedColor = z.infer<typeof SerializedVariableComposedColorSchema>;

export const SerializedEasingBezierSchema = z.object({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
});

export const SerializedEasingSpringSchema = z.object({ bounce: z.number() });

export const SerializedMotionEasingSchema = z.object({
  type: z.string(),
  easingFunctionCubicBezier: SerializedEasingBezierSchema.optional(),
  easingFunctionSpring: SerializedEasingSpringSchema.optional(),
});
export type SerializedMotionEasing = z.infer<typeof SerializedMotionEasingSchema>;

export const SerializedVariableValueSchema = z.union([
  z.boolean(),
  z.number(),
  z.string(),
  SerializedVariableColorSchema,
  SerializedVariableComposedColorSchema,
  SerializedVariableAliasSchema,
  SerializedMotionEasingSchema,
]);
export type SerializedVariableValue = z.infer<typeof SerializedVariableValueSchema>;

export const SerializedVariableCollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  defaultModeId: z.string(),
  modes: z.array(z.object({ modeId: z.string(), name: z.string() })),
  variableIds: z.array(z.string()),
});
export type SerializedVariableCollection = z.infer<typeof SerializedVariableCollectionSchema>;

export const SerializedVariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  resolvedType: z.string(),
  collectionId: z.string(),
  valuesByMode: z.record(z.string(), SerializedVariableValueSchema),
  codeSyntax: z.record(z.string(), z.string()).optional(),
  scopes: z.array(z.string()).optional(),
});
export type SerializedVariable = z.infer<typeof SerializedVariableSchema>;

export const GetVariableDefsResultSchema = z.object({
  colorProfile: DisplayP3MarkerSchema.optional(),
  collections: z.array(SerializedVariableCollectionSchema),
  variables: z.array(SerializedVariableSchema),
});
export type GetVariableDefsResult = z.infer<typeof GetVariableDefsResultSchema>;
