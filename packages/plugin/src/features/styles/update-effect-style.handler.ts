import {
  type StyleResult,
  UPDATE_EFFECT_STYLE_TOOL_NAME as TOOL,
  updateEffectStyleParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { toFigmaEffectsBound } from '../paint/bound-effects.js';
import { parseParams } from '../parse-params.js';
import { requireStyleOf } from './require-style.js';

export const createUpdateEffectStyleHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { styleId, name, effects, description } = parseParams(TOOL, updateEffectStyleParams, raw);
    const style = await requireStyleOf(figmaCtx, TOOL, styleId, 'EFFECT');
    const figmaEffects =
      effects === undefined ? undefined : await toFigmaEffectsBound(figmaCtx, effects, TOOL);
    if (name !== undefined) style.name = name;
    if (figmaEffects !== undefined) style.effects = figmaEffects;
    if (description !== undefined) style.description = description;
    const result: StyleResult = { ok: true, styleId: style.id, name: style.name };
    return result;
  };
