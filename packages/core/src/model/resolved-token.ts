import { z } from 'zod';

export const ResolvedTokenSchema = z.object({
  name: z.string(),
  type: z.string(),
  codeSyntax: z.record(z.string(), z.string()).optional(),
});
export type ResolvedToken = z.infer<typeof ResolvedTokenSchema>;
