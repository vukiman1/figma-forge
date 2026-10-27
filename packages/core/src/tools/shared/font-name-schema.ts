import { z } from 'zod';

export const fontNameSchema = z
  .object({
    family: z.string().describe('Font family, e.g. "Inter"'),
    style: z
      .string()
      .optional()
      .describe(
        'Named instance, e.g. "Bold". Omit to let Figma pick the one closest to variationSettings',
      ),
    variationSettings: z
      .record(z.string(), z.number())
      .optional()
      .describe(
        'Variable-font axis values by OpenType tag, e.g. { "wght": 650, "slnt": -5 } — the same ' +
          'shape as CSS font-variation-settings. Only for a variable family; get_fonts reports ' +
          'which tags each family accepts under variationAxes, and setting a tag the family does ' +
          'not define throws. An omitted axis keeps the named instance default.',
      ),
  })
  .describe('Font: { family, style?, variationSettings? }');
