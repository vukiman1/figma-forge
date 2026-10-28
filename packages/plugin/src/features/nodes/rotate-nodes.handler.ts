import {
  type BatchNodeResult,
  ROTATE_NODES_TOOL_NAME as TOOL,
  rotateNodesParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { applyEach } from './apply-each.js';

export const createRotateNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeIds, rotation } = parseParams(TOOL, rotateNodesParams, raw);
    const affected = await applyEach(figmaCtx, nodeIds, node => {
      if (!('rotation' in node)) return false;
      node.rotation = rotation;
      return true;
    });
    const result: BatchNodeResult = { ok: true, affected };
    return result;
  };
