import {
  UPDATE_FLOWS_TOOL_NAME as TOOL,
  type UpdateFlowsResult,
  updateFlowsParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { requireNode } from '../require-node.js';
import { refuseHiddenStarts } from './flow-diagnosis.js';
import { planFlows, refuseRepeats } from './flow-plan.js';
import { readFlows } from './flows.js';
import { writeFlows } from './write-flows.js';

const requirePage = async (figmaCtx: typeof figma, pageId: string): Promise<PageNode> => {
  const node = await requireNode(figmaCtx, TOOL, pageId);
  if (node.type === 'PAGE') return node;
  throw new Error(`${TOOL}: ${pageId} is a ${node.type}, not a page — get_pages lists page ids`);
};

export const createUpdateFlowsHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const {
      pageId,
      flows = [],
      remove = [],
      order = [],
    } = parseParams(TOOL, updateFlowsParams, raw);
    refuseRepeats(
      flows.map(flow => flow.nodeId),
      'flows',
    );
    refuseRepeats(remove, 'remove');
    refuseRepeats(order, 'order');
    const page = await requirePage(figmaCtx, pageId);
    await refuseHiddenStarts(
      figmaCtx,
      page,
      flows.map(flow => flow.nodeId),
    );
    const current = readFlows(page);
    const next = planFlows(current, { pageName: page.name, flows, remove, order });
    await writeFlows(figmaCtx, page, current, next);
    const result: UpdateFlowsResult = { ok: true, pageId: page.id, flows: readFlows(page) };
    return result;
  };
