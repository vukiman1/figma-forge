import {
  type MutateResult,
  SET_EFFECTS_TOOL_NAME as TOOL,
  setEffectsParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireNodeWith } from '../require-node.js';
import { toFigmaEffectsBound } from './bound-effects.js';

export const createSetEffectsHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, effects } = parseParams(TOOL, setEffectsParams, raw);
    const node = await requireNodeWith(figmaCtx, TOOL, nodeId, 'effects', 'cannot have effects');
    node.effects = await toFigmaEffectsBound(figmaCtx, effects, TOOL);
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
