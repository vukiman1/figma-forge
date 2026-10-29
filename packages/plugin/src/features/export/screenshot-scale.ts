export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface ScaleRequest {
  readonly requested: number | undefined;
  readonly isForVision: boolean;
  readonly shouldFit: boolean;
  readonly longEdgeCeiling: number;
}

const VISION_LONG_EDGE_PX = 2576;
const MANY_IMAGE_REQUEST_THRESHOLD = 20;
const MANY_IMAGE_LONG_EDGE_PX = 2000;
const MIN_LEGIBLE_LONG_EDGE_PX = 512;
const MAX_UPSCALE = 4;
const MIN_EXPORT_SCALE = 0.01;
const SCALE_STEPS_PER_UNIT = 100;

const longEdgeOf = (size: Size): number => Math.max(size.width, size.height);

const roundScale = (scale: number): number =>
  Math.max(MIN_EXPORT_SCALE, Math.round(scale * SCALE_STEPS_PER_UNIT) / SCALE_STEPS_PER_UNIT);

export const longEdgeCeilingFor = (imageCount: number, isForVision: boolean): number =>
  isForVision && imageCount > MANY_IMAGE_REQUEST_THRESHOLD
    ? MANY_IMAGE_LONG_EDGE_PX
    : VISION_LONG_EDGE_PX;

const autoFitScale = (size: Size, ceiling: number): number => {
  const long = longEdgeOf(size);
  if (!(long > 0)) return 1;
  if (long > ceiling) return roundScale(ceiling / long);
  return roundScale(Math.min(MAX_UPSCALE, Math.max(1, MIN_LEGIBLE_LONG_EDGE_PX / long)));
};

const capForVision = (size: Size, scale: number, ceiling: number): number => {
  const long = longEdgeOf(size);
  return long > 0 ? Math.min(scale, roundScale(ceiling / long)) : scale;
};

export const resolveScale = (size: Size | null | undefined, request: ScaleRequest): number => {
  const { requested, isForVision, shouldFit, longEdgeCeiling } = request;
  if (requested === undefined) {
    return shouldFit && size != null ? autoFitScale(size, longEdgeCeiling) : 1;
  }
  return isForVision && size != null ? capForVision(size, requested, longEdgeCeiling) : requested;
};

export const rasterSize = (
  size: Size | null | undefined,
  scale: number,
): { width: number; height: number; scale: number } | null =>
  size == null || !(size.width > 0) || !(size.height > 0)
    ? null
    : { width: Math.round(size.width * scale), height: Math.round(size.height * scale), scale };
