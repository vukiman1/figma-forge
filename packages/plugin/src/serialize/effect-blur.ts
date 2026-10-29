import type { SerializedEffect } from '@figma-forge/core';

import type { PaintOwnerSize } from './paint-types.js';
import { cssProgressiveBlurLayers } from './progressive-blur.js';

export const serializeProgressiveBlur = (
  blur: BlurEffect,
  ownerSize: PaintOwnerSize | null,
): Partial<SerializedEffect> => {
  if (blur.blurType !== 'PROGRESSIVE') return {};
  const out: Partial<SerializedEffect> = {
    blurType: 'PROGRESSIVE',
    startRadius: blur.startRadius,
    startOffset: { x: blur.startOffset.x, y: blur.startOffset.y },
    endOffset: { x: blur.endOffset.x, y: blur.endOffset.y },
  };
  const layers = cssProgressiveBlurLayers(blur, ownerSize);
  if (layers !== undefined) out.cssLayers = layers;
  return out;
};
