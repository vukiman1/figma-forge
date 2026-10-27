import {
  type MutateResult,
  SET_BLEND_MODE_TOOL_NAME as TOOL,
  setBlendModeParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { requireNodeWith } from '../require-node.js';

export const createSetBlendModeHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, blendMode } = parseParams(TOOL, setBlendModeParams, raw);
    const node = await requireNodeWith(figmaCtx, TOOL, nodeId, 'blendMode', 'has no blendMode');
    node.blendMode = blendMode;
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
