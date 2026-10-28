import {
  type MutateResult,
  SET_REPEAT_TOOL_NAME as TOOL,
  setRepeatParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { toFigmaModifier } from './repeat-modifier.js';

const requireRepeatGroup = async (
  figmaCtx: typeof figma,
  nodeId: string,
): Promise<TransformGroupNode> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node?.type === 'TRANSFORM_GROUP') return node;
  throw new Error(
    `${TOOL}: node ${nodeId} is not a repeat group (TRANSFORM_GROUP) — wrap layers in one with ` +
      'repeat_nodes',
  );
};

export const createSetRepeatHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, modifiers } = parseParams(TOOL, setRepeatParams, raw);
    const group = await requireRepeatGroup(figmaCtx, nodeId);
    group.transformModifiers = modifiers.map(toFigmaModifier);
    const result: MutateResult = { ok: true, nodeId: group.id };
    return result;
  };
