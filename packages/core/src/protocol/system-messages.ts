import { z } from 'zod';

export const HelloParamsSchema = z.object({
  clientType: z.enum(['plugin']),
  clientVersion: z.string(),
  protocolVersion: z.string(),
});
export type HelloParams = z.infer<typeof HelloParamsSchema>;

export const HelloResultSchema = z.object({
  serverVersion: z.string(),
  protocolVersion: z.string(),
  sessionResumed: z.boolean(),
  skewNotice: z.string().optional(),
  foregroundFlag: z.boolean().optional(),
});
export type HelloResult = z.infer<typeof HelloResultSchema>;

export const ActivityParamsSchema = z.object({
  fileName: z.string(),
  pageId: z.string(),
  pageName: z.string(),
  foreground: z.boolean().optional(),
});
export type ActivityParams = z.infer<typeof ActivityParamsSchema>;
