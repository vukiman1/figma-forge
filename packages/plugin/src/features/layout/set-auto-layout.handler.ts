import {
  type MutateResult,
  SET_AUTO_LAYOUT_TOOL_NAME as TOOL,
  setAutoLayoutParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { applyAutoLayout } from './apply-auto-layout.js';
import {
  assertRowCountSettable,
  assertWrapForCrossAxis,
  type AutoLayoutNode,
  switchToManualCells,
} from './auto-layout-guards.js';

const requireAutoLayoutNode = async (
  figmaCtx: typeof figma,
  nodeId: string,
): Promise<AutoLayoutNode> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node === null || !('layoutMode' in node)) {
    throw new Error(`${TOOL}: node ${nodeId} not found or has no auto layout`);
  }
  return node;
};

export const createSetAutoLayoutHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, setAutoLayoutParams, raw);
    const node = await requireAutoLayoutNode(figmaCtx, params.nodeId);
    assertWrapForCrossAxis(node, params);
    assertRowCountSettable(node, params);
    switchToManualCells(node, params);
    applyAutoLayout(node, params);
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
