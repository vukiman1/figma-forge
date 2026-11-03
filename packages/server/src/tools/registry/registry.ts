import type { ToolSpec } from '@figma-forge/core';
import { z } from 'zod';

import { READ_TOOL_SPECS } from './read-tool-specs.js';
import { WRITE_TOOL_SPECS } from './write-tool-specs.js';

const strictArgs = (spec: ToolSpec): ToolSpec => ({
  ...spec,
  inputSchema: z.strictObject(spec.inputSchema.shape),
});

export const ALL_TOOL_SPECS: readonly ToolSpec[] = [...READ_TOOL_SPECS, ...WRITE_TOOL_SPECS].map(
  strictArgs,
);

export const WRITE_TOOL_NAMES: ReadonlySet<string> = new Set(
  ALL_TOOL_SPECS.filter(spec => spec.kind === 'write').map(spec => spec.name),
);
