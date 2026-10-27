import { z } from 'zod';

import { motionEasingSchema } from './motion-easing-schema.js';
import { motionAliasSchema } from './motion-keyframe-schema.js';

export const animationStyleConfigSchema = z.object({
  duration: z.number().positive().describe('Duration in seconds').optional(),
  timelineOffset: z
    .number()
    .describe('Start offset in seconds; use index * step for staggered entrances')
    .optional(),
  props: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), motionAliasSchema, motionEasingSchema]),
    )
    .describe(
      'Preset-specific props (e.g. direction, distance, easing, delay, duration) keyed by prop ' +
        'name. Any prop may be a variable alias { type: "VARIABLE_ALIAS", id }: easing takes an ' +
        'EASING variable, delay / duration a TIMING variable (seconds)',
    )
    .optional(),
});
