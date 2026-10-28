import {
  APPLY_MANUAL_KEYFRAME_TRACK_TOOL_NAME,
  applyManualKeyframeTrackParams,
} from '@figma-forge/core';

import { assertMotionAliases } from '../../motion/motion-aliases.js';
import { assertFigmaEditor, isMotionNode, requireMotionNode } from '../../motion/motion-node.js';
import { toPlainJson } from '../../motion/node-motion.js';
import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { same } from '../snapshot/values.js';

type PropertyKeyframeField = Extract<KeyframeField, { readonly type: 'PROPERTY' }>;

interface KeyframeTrackState {
  readonly id: string;
  readonly field: PropertyKeyframeField;
  readonly previous: ManualKeyframeTrackInput | null;
}

const TOOL = batchTool(APPLY_MANUAL_KEYFRAME_TRACK_TOOL_NAME);

const snapshotTrack = (
  track: ManualKeyframeBinding | undefined,
): ManualKeyframeTrackInput | null =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a JSON round-trip of a Figma keyframe binding keeps its shape, which is a ManualKeyframeTrackInput
  track === undefined ? null : (toPlainJson(track) as ManualKeyframeTrackInput);

const restoreTrack = async (
  figmaCtx: typeof figma,
  { id, field, previous }: KeyframeTrackState,
): Promise<undefined> => {
  const node = await figmaCtx.getNodeByIdAsync(id);
  if (node === null || !isMotionNode(node)) return undefined;
  const now = node.manualKeyframeTracks[field.name];
  if (previous === null) {
    if (now !== undefined) node.removeManualKeyframeTrack(field);
  } else if (now === undefined || !same(toPlainJson(now), previous)) {
    node.applyManualKeyframeTrack(field, previous);
  }
  return undefined;
};

export const applyManualKeyframeTrackInverse: BatchInverse = defineInverse(
  APPLY_MANUAL_KEYFRAME_TRACK_TOOL_NAME,
  applyManualKeyframeTrackParams,
  {
    capture: async (figmaCtx, { nodeId, field, track }): Promise<KeyframeTrackState> => {
      assertFigmaEditor(figmaCtx, TOOL);
      if (field.type !== 'PROPERTY') {
        throw new Error(
          `${TOOL}: only PROPERTY fields are batchable — indexed fills/strokes/effects tracks have no faithful snapshot`,
        );
      }
      await assertMotionAliases(figmaCtx, TOOL, { track });
      const node = await requireMotionNode(figmaCtx, TOOL, nodeId);
      return { id: nodeId, field, previous: snapshotTrack(node.manualKeyframeTracks[field.name]) };
    },
    undo: async (figmaCtx, state) => restoreTrack(figmaCtx, state),
    touches: ({ id }) => [id],
  },
);
