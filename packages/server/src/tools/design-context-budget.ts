import {
  DESIGN_CONTEXT_TOKEN_BUDGET,
  estimateResultTokens,
  type GetDesignContextResult,
} from '@figma-forge/core';

import { projectDesignContext } from './design-context-projection.js';
import { sectionPlanFromPayload } from './design-context-section-plan.js';

const REGROUND_RULE =
  'Build the structure from the layout objects, never from x/y: emit the container and its ' +
  'gap/padding, not per-child margins or absolute offsets. To get what is missing, call ' +
  'get_design_context per section nodeId (detail: full, dedupeComponents: true) before building ' +
  'that section — never estimate those values from a screenshot.';

const overBudgetLead = (payloadChars: number): string =>
  `This tree serialized to ~${Math.round(payloadChars / 1000)}k chars at detail "full" — beyond ` +
  'what a tool result can deliver, so ';

const fits = (candidate: GetDesignContextResult): boolean =>
  estimateResultTokens(JSON.stringify(candidate)) <= DESIGN_CONTEXT_TOKEN_BUDGET;

const createLayoutDowngrade = (
  result: GetDesignContextResult,
  payloadChars: number,
  withContent: boolean,
): GetDesignContextResult => ({
  note:
    overBudgetLead(payloadChars) +
    'this is the same tree with its LAYOUT intact and its APPEARANCE dropped. Every frame still ' +
    'carries its exact layout (flex/grid mode, padding, itemSpacing/gap, alignment) and each ' +
    'node its sizing and constraints' +
    (withContent
      ? ', and each text its characters. What is missing is colour, typography, effects and '
      : '. What is missing is text content, colour, typography, effects and ') +
    'token bindings. ' +
    REGROUND_RULE,
  ...projectDesignContext(result, withContent ? 'layout-content' : 'layout'),
});

const createCompactDowngrade = (
  result: GetDesignContextResult,
  payloadChars: number,
): GetDesignContextResult => ({
  note:
    overBudgetLead(payloadChars) +
    'and too large even with layout alone, this is the structure-only (compact) view of the same ' +
    'tree. It carries no layout, styling, text or tokens, so it is a MAP, not a spec: use it to ' +
    'pick sections, never to generate from. Call get_design_context on each section nodeId ' +
    '(detail: full, dedupeComponents: true) to ground it before building — and in particular do ' +
    'not turn the x/y deltas here into margins, since the spacing they encode belongs to a layout ' +
    'you have not been given.',
  ...projectDesignContext(result, 'compact'),
});

const downgradeUnsplittable = (
  result: GetDesignContextResult,
  payloadChars: number,
): GetDesignContextResult => {
  const candidates = [
    createLayoutDowngrade(result, payloadChars, false),
    createCompactDowngrade(result, payloadChars),
  ];
  return candidates.find(fits) ?? result;
};

export const guardDesignContextBudget = (
  result: GetDesignContextResult,
  detail: string,
): GetDesignContextResult => {
  const serialized = JSON.stringify(result);
  if (estimateResultTokens(serialized) <= DESIGN_CONTEXT_TOKEN_BUDGET) return result;
  const payloadChars = serialized.length;
  if (detail !== 'full') return sectionPlanFromPayload(result, payloadChars) ?? result;
  const layoutWithContent = createLayoutDowngrade(result, payloadChars, true);
  if (fits(layoutWithContent)) return layoutWithContent;
  const plan = sectionPlanFromPayload(result, payloadChars);
  return plan ?? downgradeUnsplittable(result, payloadChars);
};
