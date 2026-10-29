import { z } from 'zod';

export const lineHeightSchema = z
  .union([
    z.object({ unit: z.literal('AUTO') }),
    z.object({ unit: z.enum(['PIXELS', 'PERCENT']), value: z.number() }),
  ])
  .describe('Line height: { unit: "AUTO" } or { unit: "PIXELS" | "PERCENT", value }');

export const letterSpacingSchema = z
  .object({ unit: z.enum(['PIXELS', 'PERCENT']), value: z.number() })
  .describe('Letter spacing: { unit: "PIXELS" | "PERCENT", value }');

export type LineHeightParam = z.infer<typeof lineHeightSchema>;
export type LetterSpacingParam = z.infer<typeof letterSpacingSchema>;
