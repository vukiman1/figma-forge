import type { SerializedPaint } from '@figma-forge/core';

import { cssCropTransform } from './crop-transform.js';
import type { PaintOwnerSize, PaintVisibility } from './paint-types.js';
import { round6 } from './rounding.js';

type ScaleMode = 'FILL' | 'FIT' | 'CROP' | 'TILE';

interface MediaFields {
  readonly scaleMode?: ScaleMode;
  readonly filters?: unknown;
  readonly imageTransform?: Transform;
}

const hasImageAdjustments = (filters: unknown): boolean =>
  typeof filters === 'object' &&
  filters !== null &&
  Object.values(filters).some(v => typeof v === 'number' && v !== 0);

const cropOf = (media: MediaFields): Transform | undefined =>
  media.scaleMode === 'CROP' && Array.isArray(media.imageTransform)
    ? media.imageTransform
    : undefined;

export const serializeMedia = (
  paint: ImagePaint | VideoPaint,
  ownerSize: PaintOwnerSize | null,
  { visible, opacity }: PaintVisibility,
): SerializedPaint => {
  const media: MediaFields = paint;
  const scaleMode = media.scaleMode;
  const isFiltered = 'filters' in paint && hasImageAdjustments(media.filters);
  const crop = cropOf(media);
  const cssTransform = crop === undefined ? undefined : cssCropTransform(crop, ownerSize);
  return {
    type: paint.type,
    visible,
    opacity,
    ...(scaleMode === undefined ? {} : { scaleMode }),
    ...(crop === undefined ? {} : { imageTransform: crop.map(row => row.map(round6)) }),
    ...(cssTransform === undefined ? {} : { cssTransform }),
    ...(isFiltered ? { filtersApplied: true } : {}),
  };
};
