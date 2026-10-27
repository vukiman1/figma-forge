import {
  APPLY_MANUAL_KEYFRAME_TRACK_TOOL_NAME as TOOL,
  applyManualKeyframeTrackParams,
  type MutateResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { assertMotionAliases } from './motion-aliases.js';
import { assertFigmaEditor, requireMotionNode } from './motion-node.js';

export const createApplyManualKeyframeTrackHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, field, track } = parseParams(TOOL, applyManualKeyframeTrackParams, raw);
    assertFigmaEditor(figmaCtx, TOOL);
    await assertMotionAliases(figmaCtx, TOOL, { track });
    const node = await requireMotionNode(figmaCtx, TOOL, nodeId);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the track schema mirrors Figma's ManualKeyframeTrackInput and Figma validates it
    node.applyManualKeyframeTrack(field as KeyframeField, track as ManualKeyframeTrackInput);
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
