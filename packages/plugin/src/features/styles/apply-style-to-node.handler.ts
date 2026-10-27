import {
  APPLY_STYLE_TO_NODE_TOOL_NAME as TOOL,
  applyStyleToNodeParams,
  type MutateResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { requireNode } from '../require-node.js';

const SETTER_BY_FIELD = {
  fill: 'setFillStyleIdAsync',
  stroke: 'setStrokeStyleIdAsync',
  effect: 'setEffectStyleIdAsync',
  grid: 'setGridStyleIdAsync',
  text: 'setTextStyleIdAsync',
} as const;

export const createApplyStyleToNodeHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, styleId, field } = parseParams(TOOL, applyStyleToNodeParams, raw);
    const node = await requireNode(figmaCtx, TOOL, nodeId);
    const setter: unknown = Reflect.get(node, SETTER_BY_FIELD[field]);
    if (typeof setter !== 'function') {
      throw new Error(`${TOOL}: node ${nodeId} cannot take a ${field} style`);
    }
    const applied: unknown = Reflect.apply(setter, node, [styleId]);
    await applied;
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
