import {
  CREATE_EFFECT_STYLE_TOOL_NAME as TOOL,
  createEffectStyleParams,
  type StyleResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { toFigmaEffectsBound } from '../paint/bound-effects.js';
import { parseParams } from '../parse-params.js';

export const createCreateEffectStyleHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { name, effects, description } = parseParams(TOOL, createEffectStyleParams, raw);
    const figmaEffects = await toFigmaEffectsBound(figmaCtx, effects, TOOL);
    const style = figmaCtx.createEffectStyle();
    style.name = name;
    style.effects = figmaEffects;
    if (description !== undefined) style.description = description;
    const result: StyleResult = { ok: true, styleId: style.id, name: style.name };
    return result;
  };
