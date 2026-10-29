import { z } from 'zod';

import { keyframeFieldSchema } from '../shared/motion-keyframe-schema.js';
import type { ToolSpec } from '../tool-spec.js';

export const REMOVE_MANUAL_KEYFRAME_TRACK_TOOL_NAME = 'remove_manual_keyframe_track';

export const removeManualKeyframeTrackParams = z.object({
  nodeId: z.string().describe('Figma node id to clear a keyframe track from'),
  field: keyframeFieldSchema,
});

export const removeManualKeyframeTrackTool: ToolSpec = {
  name: REMOVE_MANUAL_KEYFRAME_TRACK_TOOL_NAME,
  description:
    'Remove the manual Figma Motion keyframe track for a given field on a node. `field` selects the ' +
    'same target as apply_manual_keyframe_track (a node PROPERTY or an indexed fills/strokes/effects ' +
    'item). Returns { ok, nodeId }.',
  inputSchema: removeManualKeyframeTrackParams,
  kind: 'write',
  destructive: true,
};
