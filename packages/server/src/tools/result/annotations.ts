import type { ToolSpec } from '@figma-forge/core';
import type { ToolAnnotations } from '@modelcontextprotocol/server';

export const annotationsFor = (spec: ToolSpec): ToolAnnotations =>
  spec.kind === 'write'
    ? { readOnlyHint: false, destructiveHint: spec.destructive === true }
    : { readOnlyHint: true };
