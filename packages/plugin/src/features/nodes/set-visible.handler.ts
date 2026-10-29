import {
  type MutateResult,
  SET_VISIBLE_TOOL_NAME as TOOL,
  setVisibleParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireNodeWith } from '../require-node.js';

export const createSetVisibleHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, visible } = parseParams(TOOL, setVisibleParams, raw);
    const node = await requireNodeWith(figmaCtx, TOOL, nodeId, 'visible', 'cannot be hidden');
    node.visible = visible;
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
