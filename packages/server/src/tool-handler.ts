import type { CallToolResult } from '@modelcontextprotocol/server';

export type ToolHandler = (args: Record<string, unknown>) => Promise<CallToolResult>;

export const textResult = (data: unknown): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(data) }],
});
