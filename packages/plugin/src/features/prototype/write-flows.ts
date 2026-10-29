import { UPDATE_FLOWS_TOOL_NAME as TOOL, type FlowStartingPoint } from '@figma-forge/core';

import { errorMessage } from '../error-message.js';
import { diagnoseFlowStarts } from './flow-diagnosis.js';
import { readFlows, sameFlows } from './flows.js';

const withReasons = (reasons: readonly string[]): string =>
  reasons.length > 0 ? ` — ${reasons.join('; ')}` : '';

const tryRestore = (page: PageNode, current: readonly FlowStartingPoint[]): boolean => {
  try {
    page.flowStartingPoints = current;
    return true;
  } catch {
    return false;
  }
};

const writeOrExplain = async (
  figmaCtx: typeof figma,
  page: PageNode,
  next: readonly FlowStartingPoint[],
  added: readonly string[],
): Promise<void> => {
  try {
    page.flowStartingPoints = next;
  } catch (error) {
    const reasons = await diagnoseFlowStarts(figmaCtx, page, added);
    throw new Error(
      `${TOOL}: Figma refused the new flow list for page "${page.name}", which is unchanged ` +
        `(${errorMessage(error)})${withReasons(reasons)}`,
      { cause: error },
    );
  }
};

const explainDrift = async (
  figmaCtx: typeof figma,
  page: PageNode,
  next: readonly FlowStartingPoint[],
  landed: readonly FlowStartingPoint[],
  restored: boolean,
): Promise<Error> => {
  const dropped = next
    .filter(flow => !landed.some(kept => kept.nodeId === flow.nodeId))
    .map(flow => flow.nodeId);
  const reasons = await diagnoseFlowStarts(figmaCtx, page, dropped);
  const what =
    dropped.length > 0
      ? `Figma accepted the list but dropped ${dropped.join(', ')}` +
        (reasons.length > 0 ? ` (${reasons.join('; ')})` : '')
      : 'Figma accepted the list but reads it back differently';
  const after = restored
    ? `The flows listed on page "${page.name}" were put back as they were, but Figma may still ` +
      'hold a dropped entry out of sight and list it once its frame qualifies'
    : `The flows on page "${page.name}" could not be put back and now read ${JSON.stringify(readFlows(page))}`;
  return new Error(`${TOOL}: ${what}. ${after}`);
};

export const writeFlows = async (
  figmaCtx: typeof figma,
  page: PageNode,
  current: readonly FlowStartingPoint[],
  next: readonly FlowStartingPoint[],
): Promise<void> => {
  if (sameFlows(current, next)) return;
  const added = next
    .filter(flow => !current.some(c => c.nodeId === flow.nodeId))
    .map(flow => flow.nodeId);
  await writeOrExplain(figmaCtx, page, next, added);
  const landed = readFlows(page);
  if (sameFlows(landed, next)) return;
  throw await explainDrift(figmaCtx, page, next, landed, tryRestore(page, current));
};
