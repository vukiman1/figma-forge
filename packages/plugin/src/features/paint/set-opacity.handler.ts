import {
  type MutateResult,
  SET_OPACITY_TOOL_NAME as TOOL,
  setOpacityParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireNodeWith } from '../require-node.js';

export const createSetOpacityHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, opacity } = parseParams(TOOL, setOpacityParams, raw);
    const node = await requireNodeWith(figmaCtx, TOOL, nodeId, 'opacity', 'has no opacity');
    node.opacity = opacity;
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
