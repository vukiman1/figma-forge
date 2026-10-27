import type { z } from 'zod';

export type ToolKind = 'read' | 'write' | 'local';

export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: z.ZodObject;
  kind: ToolKind;
  destructive?: true;
  injectedArgs?: readonly string[];
  serverOnlyArgs?: readonly string[] | null;
}
