import { type MutateResult, SET_FILLS_TOOL_NAME as TOOL, setFillsParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { requireNodeWith } from '../require-node.js';
import { toFigmaPaintsBound } from './bound-paints.js';
import { writePaints } from './write-paints.js';

export const createSetFillsHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, fills } = parseParams(TOOL, setFillsParams, raw);
    const node = await requireNodeWith(figmaCtx, TOOL, nodeId, 'fills', 'cannot have fills');
    await writePaints(node, 'fills', await toFigmaPaintsBound(figmaCtx, fills, TOOL));
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
