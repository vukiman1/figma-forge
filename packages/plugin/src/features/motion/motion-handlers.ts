import type { HandlerFactories } from '../handler-factories.js';
import { createApplyAnimationStyleHandler } from './apply-animation-style.handler.js';
import { createApplyManualKeyframeTrackHandler } from './apply-manual-keyframe-track.handler.js';
import { createGetMotionContextHandler } from './get-motion-context.handler.js';
import { createGetMotionStylesHandler } from './get-motion-styles.handler.js';
import { createGetNodeMotionHandler } from './get-node-motion.handler.js';
import { createRemoveAnimationStyleHandler } from './remove-animation-style.handler.js';
import { createRemoveManualKeyframeTrackHandler } from './remove-manual-keyframe-track.handler.js';
import { createSetTimelineDurationHandler } from './set-timeline-duration.handler.js';

export const MOTION_WRITES: HandlerFactories = {
  apply_animation_style: createApplyAnimationStyleHandler,
  remove_animation_style: createRemoveAnimationStyleHandler,
  apply_manual_keyframe_track: createApplyManualKeyframeTrackHandler,
  remove_manual_keyframe_track: createRemoveManualKeyframeTrackHandler,
  set_timeline_duration: createSetTimelineDurationHandler,
};

export const MOTION_READS: HandlerFactories = {
  get_motion_styles: createGetMotionStylesHandler,
  get_node_motion: createGetNodeMotionHandler,
  get_motion_context: createGetMotionContextHandler,
};
