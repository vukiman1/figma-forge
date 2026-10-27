import { z } from 'zod';

import { SerializedPaintSchema } from './paint.js';
import { optionalOrMixed, SerializedStyleIdsSchema } from './primitives.js';

export const SerializedFontNameSchema = z.object({
  family: z.string(),
  style: z.string(),
  variationSettings: z.record(z.string(), z.number()).optional(),
});
export type SerializedFontName = z.infer<typeof SerializedFontNameSchema>;

export const SerializedLineHeightSchema = z.object({
  unit: z.string(),
  value: z.number().optional(),
});
export type SerializedLineHeight = z.infer<typeof SerializedLineHeightSchema>;

export const SerializedLetterSpacingSchema = z.object({ unit: z.string(), value: z.number() });
export type SerializedLetterSpacing = z.infer<typeof SerializedLetterSpacingSchema>;

export const SerializedHyperlinkSchema = z.object({ type: z.string(), value: z.string() });
export type SerializedHyperlink = z.infer<typeof SerializedHyperlinkSchema>;

export const SerializedTextPathStartSchema = z.object({
  segment: z.number(),
  position: z.number(),
});
export type SerializedTextPathStart = z.infer<typeof SerializedTextPathStartSchema>;

export const textSegmentFields = {
  characters: z.string(),
  start: z.number(),
  end: z.number(),
  fontName: SerializedFontNameSchema,
  fontSize: z.number(),
  textDecoration: z.string(),
  textCase: z.string(),
  lineHeight: optionalOrMixed(SerializedLineHeightSchema),
  letterSpacing: optionalOrMixed(SerializedLetterSpacingSchema),
  hyperlink: SerializedHyperlinkSchema.optional(),
  listOptions: z.string().optional(),
  indentation: z.number().optional(),
  textWrapStyle: z.string().optional(),
  styleIds: SerializedStyleIdsSchema.optional(),
  boundVariables: z.record(z.string(), z.array(z.string())).optional(),
};

export const SerializedTextSegmentSchema = z.object({
  ...textSegmentFields,
  fills: z.array(SerializedPaintSchema),
});
export type SerializedTextSegment = z.infer<typeof SerializedTextSegmentSchema>;
