import type { GetMotionStylesResult, MotionStyle } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { motionApi } from './motion-node.js';

const toMotionStyle = (style: AvailableAnimationStyle): MotionStyle => ({
  styleId: style.styleId,
  name: style.name,
  ...(style.description === undefined ? {} : { description: style.description }),
  ...(style.props === undefined ? {} : { props: { ...style.props } }),
});

export const createGetMotionStylesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async () => {
    const motion = motionApi(figmaCtx);
    if (typeof motion?.figmaAnimationStyles !== 'function') {
      throw new Error('get_motion_styles: the Figma Motion API is not available here.');
    }
    const result: GetMotionStylesResult = {
      styles: motion.figmaAnimationStyles().map(toMotionStyle),
    };
    return result;
  };
