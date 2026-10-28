import {
  type MutateResult,
  SET_LAYOUT_GRIDS_TOOL_NAME as TOOL,
  setLayoutGridsParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireNodeWith } from '../require-node.js';
import { toFigmaLayoutGridsBound } from './bound-layout-grids.js';

export const createSetLayoutGridsHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, grids } = parseParams(TOOL, setLayoutGridsParams, raw);
    const node = await requireNodeWith(
      figmaCtx,
      TOOL,
      nodeId,
      'layoutGrids',
      'does not support layout grids',
    );
    node.layoutGrids = await toFigmaLayoutGridsBound(figmaCtx, grids, TOOL);
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
