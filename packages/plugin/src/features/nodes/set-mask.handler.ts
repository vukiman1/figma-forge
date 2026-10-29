import { type MutateResult, SET_MASK_TOOL_NAME as TOOL, setMaskParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireNodeWith } from '../require-node.js';

export const createSetMaskHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, isMask, maskType } = parseParams(TOOL, setMaskParams, raw);
    const node = await requireNodeWith(figmaCtx, TOOL, nodeId, 'isMask', 'cannot be a mask');
    node.isMask = isMask;
    if (isMask && maskType !== undefined && 'maskType' in node) node.maskType = maskType;
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
