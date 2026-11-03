import type { ToolSpec } from '@figma-forge/core';
import type { Tool } from '@modelcontextprotocol/server';
import { z } from 'zod';

export const toToolDefinition = (spec: ToolSpec): Tool => ({
  name: spec.name,
  description: spec.description,
  inputSchema: z.toJSONSchema(spec.inputSchema, {
    io: 'input',
    target: 'draft-2020-12',
  }) as Tool['inputSchema'],
});
