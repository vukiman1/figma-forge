import { z } from 'zod';

import { SerializedEffectSchema } from './effect.js';
import { SerializedLayoutGridSchema } from './layout.js';
import { SerializedPaintSchema } from './paint.js';
import { DisplayP3MarkerSchema, SerializedBindingsSchema } from './primitives.js';
import { ResolvedTokenSchema } from './resolved-token.js';
import {
  SerializedFontNameSchema,
  SerializedLetterSpacingSchema,
  SerializedLineHeightSchema,
} from './text.js';

const styleBase = {
  id: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string(),
} as const;

export const SerializedPaintStyleSchema = z.object({
  ...styleBase,
  paints: z.array(SerializedPaintSchema),
});
export type SerializedPaintStyle = z.infer<typeof SerializedPaintStyleSchema>;

export const SerializedTextStyleSchema = z.object({
  ...styleBase,
  fontName: SerializedFontNameSchema,
  fontSize: z.number(),
  lineHeight: SerializedLineHeightSchema,
  letterSpacing: SerializedLetterSpacingSchema,
  textWrapStyle: z.string(),
  boundVariables: SerializedBindingsSchema.optional(),
});
export type SerializedTextStyle = z.infer<typeof SerializedTextStyleSchema>;

export const SerializedEffectStyleSchema = z.object({
  ...styleBase,
  effects: z.array(SerializedEffectSchema),
});
export type SerializedEffectStyle = z.infer<typeof SerializedEffectStyleSchema>;

export const SerializedGridStyleSchema = z.object({
  ...styleBase,
  grids: z.array(SerializedLayoutGridSchema),
});
export type SerializedGridStyle = z.infer<typeof SerializedGridStyleSchema>;

export const GetStylesResultSchema = z.object({
  colorProfile: DisplayP3MarkerSchema.optional(),
  paints: z.array(SerializedPaintStyleSchema),
  texts: z.array(SerializedTextStyleSchema),
  effects: z.array(SerializedEffectStyleSchema),
  grids: z.array(SerializedGridStyleSchema),
  variables: z.record(z.string(), ResolvedTokenSchema).optional(),
});
export type GetStylesResult = z.infer<typeof GetStylesResultSchema>;
