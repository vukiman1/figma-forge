import {
  APPLY_ANIMATION_STYLE_TOOL_NAME as TOOL,
  type ApplyAnimationStyleResult,
  applyAnimationStyleParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { assertMotionAliases } from './motion-aliases.js';
import { assertFigmaEditor, requireMotionNode } from './motion-node.js';

export const createApplyAnimationStyleHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, styleId, config } = parseParams(TOOL, applyAnimationStyleParams, raw);
    assertFigmaEditor(figmaCtx, TOOL);
    await assertMotionAliases(figmaCtx, TOOL, { config });
    const node = await requireMotionNode(figmaCtx, TOOL, nodeId);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the config schema mirrors Figma's AnimationStyleConfiguration and Figma validates it
    const configuration = config as AnimationStyleConfiguration | undefined;
    const appliedStyleId = node.applyAnimationStyle(styleId, configuration);
    const result: ApplyAnimationStyleResult = { ok: true, nodeId: node.id, appliedStyleId };
    return result;
  };
