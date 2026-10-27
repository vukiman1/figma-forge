import { z } from 'zod';

export const repeatModifierSchema = z.object({
  type: z.literal('REPEAT').optional().describe('Always REPEAT; optional'),
  repeatType: z.enum(['LINEAR', 'RADIAL']),
  count: z
    .number()
    .int()
    .min(2)
    .max(40)
    .describe('How many times the content is drawn in all, the original included (2–40)'),
  offset: z
    .number()
    .describe(
      'LINEAR: the step from one copy to the next along axis. RADIAL: the diameter of the circle ' +
        'the content’s centre travels round (not a radius). Pixels, or with unitType RELATIVE a ' +
        'multiple of the content’s size. Negative steps go backwards',
    ),
  unitType: z
    .enum(['PIXELS', 'RELATIVE'])
    .optional()
    .describe(
      'PIXELS (default) or RELATIVE: offset × the content’s width (LINEAR HORIZONTAL) or height ' +
        '(LINEAR VERTICAL and RADIAL) — LINEAR 1 = copies touching',
    ),
  axis: z
    .enum(['HORIZONTAL', 'VERTICAL'])
    .optional()
    .describe('LINEAR only: the direction copies step in (default HORIZONTAL)'),
});

export const REPEAT_SEMANTICS =
  'LINEAR draws count copies in total, each offset further along axis. RADIAL turns each copy a ' +
  'further 360°/count clockwise about a point straight below the content, so the content’s centre ' +
  'travels a circle offset px across — offset is that circle’s diameter. A second modifier ' +
  'repeats everything the first one drew: two LINEAR ones on different axes make a grid.';
