import {
  type MutateResult,
  REMOVE_MANUAL_KEYFRAME_TRACK_TOOL_NAME as TOOL,
  removeManualKeyframeTrackParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { requireMotionNode } from './motion-node.js';

export const createRemoveManualKeyframeTrackHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, field } = parseParams(TOOL, removeManualKeyframeTrackParams, raw);
    const node = await requireMotionNode(figmaCtx, TOOL, nodeId);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the field schema mirrors Figma's KeyframeField and Figma validates it
    node.removeManualKeyframeTrack(field as KeyframeField);
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
