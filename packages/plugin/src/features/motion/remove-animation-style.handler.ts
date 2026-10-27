import {
  type MutateResult,
  REMOVE_ANIMATION_STYLE_TOOL_NAME as TOOL,
  removeAnimationStyleParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { requireMotionNode } from './motion-node.js';

export const createRemoveAnimationStyleHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, animationStyleId } = parseParams(TOOL, removeAnimationStyleParams, raw);
    const node = await requireMotionNode(figmaCtx, TOOL, nodeId);
    const ids =
      animationStyleId === undefined
        ? node.animationStyles.map(applied => applied.id)
        : [animationStyleId];
    for (const id of ids) node.removeAnimationStyle(id);
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
