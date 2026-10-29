import { TOOL_RESULT_LIMIT_BYTES } from '@figma-forge/core';

const BYTES_PER_MEGABYTE = 1024 * 1024;

export interface CharBudget {
  readonly limit: number;
  used: number;
}

export const resultCharBudget = (): CharBudget => ({ limit: TOOL_RESULT_LIMIT_BYTES, used: 0 });

export const RESULT_LIMIT_LABEL = `${(TOOL_RESULT_LIMIT_BYTES / BYTES_PER_MEGABYTE).toFixed(1)} MB`;

export const treeTooLargeError = (tool: string, total: number, subject = 'tree'): Error =>
  new Error(
    `${tool}: this ${subject} has ${total} nodes and serializes past ${RESULT_LIMIT_LABEL} — more ` +
      'than one tool result can carry. Read it in parts: get_node on one of its children, or ' +
      'get_design_context, which splits a large tree into sections.',
  );
