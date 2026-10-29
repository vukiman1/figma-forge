import { DESIGN_CONTEXT_TOKEN_BUDGET, estimateResultTokens } from '@figma-forge/core';

export const MAX_VISITED_NODES = 10_000;
export const MAX_DIAGNOSTICS = 20;
export const MAX_MESSAGE_CHARS = 300;
export const DIAGNOSTIC_TOKEN_BUDGET = 4_000;
export const PENDING_TOKEN_RESERVE = 1_500;

const ENVELOPE_TOKEN_RESERVE = 500;

export const NODE_TOKEN_BUDGET =
  DESIGN_CONTEXT_TOKEN_BUDGET -
  DIAGNOSTIC_TOKEN_BUDGET -
  PENDING_TOKEN_RESERVE -
  ENVELOPE_TOKEN_RESERVE;

export const costOf = (value: unknown): number => estimateResultTokens(JSON.stringify(value)) + 1;
