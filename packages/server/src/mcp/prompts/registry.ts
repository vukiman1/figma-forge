import type { GetPromptResult, Prompt } from '@modelcontextprotocol/server';

import { codeToFigmaPrompt } from './code-to-figma.js';
import { figmaToCodePrompt } from './figma-to-code.js';
import type { PromptArgs, PromptEntry } from './prompt-types.js';

export const PROMPTS: readonly PromptEntry[] = [figmaToCodePrompt, codeToFigmaPrompt];

export const PROMPT_DEFINITIONS: readonly Prompt[] = PROMPTS.map(p => p.definition);

export const buildPrompt = (name: string, args: PromptArgs): GetPromptResult | null =>
  PROMPTS.find(p => p.definition.name === name)?.build(args) ?? null;
