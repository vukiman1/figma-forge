import { z } from 'zod';

export const VIDEO_FPS = {
  MP4: [12, 24, 30, 60],
  WEBM: [12, 24, 30, 60],
  GIF: [8, 12, 15, 24, 30],
} as const;

export const videoExportConstraintSchema = z
  .union([
    z.object({
      type: z.literal('SCALE'),
      value: z.union([
        z.literal(0.5),
        z.literal(0.75),
        z.literal(1),
        z.literal(1.5),
        z.literal(2),
        z.literal(3),
        z.literal(4),
      ]),
    }),
    z.object({ type: z.literal('WIDTH'), value: z.number().positive() }),
    z.object({ type: z.literal('HEIGHT'), value: z.number().positive() }),
  ])
  .describe('Output size: a SCALE multiplier (0.5/0.75/1/1.5/2/3/4) or a fixed WIDTH/HEIGHT in px');
