import {
  type MutateResult,
  SET_CONSTRAINTS_TOOL_NAME as TOOL,
  setConstraintsParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { requireNodeWith } from '../require-node.js';

export const createSetConstraintsHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, horizontal, vertical } = parseParams(TOOL, setConstraintsParams, raw);
    const node = await requireNodeWith(figmaCtx, TOOL, nodeId, 'constraints', 'has no constraints');
    node.constraints = { horizontal, vertical };
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
