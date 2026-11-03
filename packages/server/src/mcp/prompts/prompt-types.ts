import type { GetPromptResult, Prompt } from '@modelcontextprotocol/server';
import type { z, ZodType } from 'zod';

export type PromptArgsSchema = z.ZodObject<
  Record<string, ZodType<string | undefined, string | undefined>>
>;

export type PromptArgs = Record<string, string | undefined>;

export interface PromptEntry {
  definition: Prompt;
  argsSchema: PromptArgsSchema;
  build: (args: PromptArgs) => GetPromptResult;
}
