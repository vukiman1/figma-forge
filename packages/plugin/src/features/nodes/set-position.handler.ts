import {
  type MutateResult,
  SET_POSITION_TOOL_NAME as TOOL,
  setPositionParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireNodeWith } from '../require-node.js';

const isInLayoutFlow = (node: BaseNode): boolean => {
  const parent = 'parent' in node ? node.parent : null;
  const parentFlows = parent !== null && 'layoutMode' in parent && parent.layoutMode !== 'NONE';
  return parentFlows && 'layoutPositioning' in node && node.layoutPositioning !== 'ABSOLUTE';
};

export const createSetPositionHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, x, y } = parseParams(TOOL, setPositionParams, raw);
    const node = await requireNodeWith(figmaCtx, TOOL, nodeId, 'x', 'has no position');
    if (isInLayoutFlow(node)) {
      throw new Error(
        `${TOOL}: node ${nodeId} is an in-flow child of an auto-layout frame — its x/y are ` +
          'controlled by the layout and a write would be silently reflowed away. Set ' +
          'layoutPositioning ABSOLUTE (set_layout_props) first to place it freely.',
      );
    }
    if (x !== undefined) node.x = x;
    if (y !== undefined) Reflect.set(node, 'y', y);
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
