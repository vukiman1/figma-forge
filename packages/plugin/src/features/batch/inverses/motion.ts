import {
  APPLY_ANIMATION_STYLE_TOOL_NAME,
  applyAnimationStyleParams,
  SET_TIMELINE_DURATION_TOOL_NAME,
  setTimelineDurationParams,
} from '@figma-forge/core';

import { assertMotionAliases } from '../../motion/motion-aliases.js';
import { assertFigmaEditor, isMotionNode, requireMotionNode } from '../../motion/motion-node.js';
import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { resultId } from '../op-result.js';

interface MotionNodeState {
  readonly id: string;
}

interface TimelineState {
  readonly id: string;
  readonly timelineId: string;
  readonly duration: number;
}

const APPLY_ANIMATION_STYLE = batchTool(APPLY_ANIMATION_STYLE_TOOL_NAME);

const SET_TIMELINE_DURATION = batchTool(SET_TIMELINE_DURATION_TOOL_NAME);

const removeAppliedStyle = async (figmaCtx: typeof figma, result: unknown): Promise<void> => {
  const nodeId = resultId(result);
  const appliedStyleId = resultId(result, 'appliedStyleId');
  if (nodeId === null || appliedStyleId === null) return;
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node !== null && isMotionNode(node)) node.removeAnimationStyle(appliedStyleId);
};

export const applyAnimationStyleInverse: BatchInverse = defineInverse(
  APPLY_ANIMATION_STYLE_TOOL_NAME,
  applyAnimationStyleParams,
  {
    capture: async (figmaCtx, { nodeId, config }): Promise<MotionNodeState> => {
      assertFigmaEditor(figmaCtx, APPLY_ANIMATION_STYLE);
      await assertMotionAliases(figmaCtx, APPLY_ANIMATION_STYLE, { config });
      await requireMotionNode(figmaCtx, APPLY_ANIMATION_STYLE, nodeId);
      return { id: nodeId };
    },
    undo: async (figmaCtx, _state, result) => {
      await removeAppliedStyle(figmaCtx, result);
      return undefined;
    },
    touches: ({ id }) => [id],
  },
);

export const setTimelineDurationInverse: BatchInverse = defineInverse(
  SET_TIMELINE_DURATION_TOOL_NAME,
  setTimelineDurationParams,
  {
    capture: async (figmaCtx, { nodeId, timelineId }): Promise<TimelineState> => {
      const node = await requireMotionNode(figmaCtx, SET_TIMELINE_DURATION, nodeId);
      const timeline = node.timelines.find(candidate => candidate.id === timelineId);
      if (timeline === undefined) {
        throw new Error(
          `${SET_TIMELINE_DURATION}: timeline ${timelineId} not found on node ${nodeId}`,
        );
      }
      return { id: nodeId, timelineId, duration: timeline.duration };
    },
    undo: async (figmaCtx, { id, timelineId, duration }) => {
      const node = await figmaCtx.getNodeByIdAsync(id);
      if (node !== null && isMotionNode(node)) node.setTimelineDuration(timelineId, duration);
      return undefined;
    },
  },
);
