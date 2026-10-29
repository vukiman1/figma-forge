import {
  type MutateResult,
  SET_TIMELINE_DURATION_TOOL_NAME as TOOL,
  setTimelineDurationParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireMotionNode } from './motion-node.js';

export const createSetTimelineDurationHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, timelineId, duration } = parseParams(TOOL, setTimelineDurationParams, raw);
    const node = await requireMotionNode(figmaCtx, TOOL, nodeId);
    node.setTimelineDuration(timelineId, duration);
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
