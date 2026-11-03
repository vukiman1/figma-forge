import {
  DESIGN_CONTEXT_TOKEN_BUDGET,
  estimateResultTokens,
  type GetDesignContextResult,
  getDesignContextParams,
  getDesignContextTool,
} from '@figma-forge/core';

import { annotateProjectTokens, loadTokenValueIndex } from '../../tokens/token-index.js';
import { guardDesignContextBudget } from './design-context-budget.js';

const BELOW_FULL_NOTE =
  'Styling, layout, text and design-token fields are omitted below detail "full". For code ' +
  'generation call again with detail: "full" and dedupeComponents: true — never estimate those ' +
  'values from a screenshot, and never reconstruct spacing from x/y as per-child margins.';

export type ToolDispatcher = (toolName: string, args: unknown) => Promise<unknown>;

export class InvalidDesignContextResultError extends Error {
  public constructor() {
    super('get_design_context returned a payload without a nodes array');
    this.name = 'InvalidDesignContextResultError';
  }
}

const isDesignContextResult = (value: unknown): value is GetDesignContextResult =>
  typeof value === 'object' && value !== null && 'nodes' in value && Array.isArray(value.nodes);

const parseDesignContextResult = (value: unknown): GetDesignContextResult => {
  if (isDesignContextResult(value)) return value;
  throw new InvalidDesignContextResultError();
};

const withLeadingNote = (result: GetDesignContextResult): GetDesignContextResult => {
  const { note: superseded, ...rest } = result;
  void superseded;
  return { note: BELOW_FULL_NOTE, ...rest };
};

const annotateResult = async (
  result: GetDesignContextResult,
  detail: string,
  loadIndex: typeof loadTokenValueIndex,
): Promise<GetDesignContextResult> => {
  if (detail !== 'full') return result;
  const { index, utilityFirst } = await loadIndex(process.cwd());
  return annotateProjectTokens(result, index, utilityFirst);
};

export const handleDesignContext = async (
  dispatch: ToolDispatcher,
  rawArgs: unknown,
  loadIndex: typeof loadTokenValueIndex = loadTokenValueIndex,
): Promise<GetDesignContextResult> => {
  const args = getDesignContextParams.parse(rawArgs ?? {});
  const detail = args.detail ?? 'full';
  const raw = parseDesignContextResult(
    await dispatch(getDesignContextTool.name, {
      ...args,
      detail,
      dedupeComponents: args.dedupeComponents ?? true,
      budget: true,
    }),
  );
  if (raw.sectionPlan !== undefined) return raw;
  const result = await annotateResult(raw, detail, loadIndex);
  const isWithinBudget =
    estimateResultTokens(JSON.stringify(result)) <= DESIGN_CONTEXT_TOKEN_BUDGET;
  if (isWithinBudget) return detail === 'full' ? result : withLeadingNote(result);
  return guardDesignContextBudget(result, detail);
};

export { sectionPlanFromPayload } from './design-context-section-plan.js';
