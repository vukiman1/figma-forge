const ORTHONORMAL_TOLERANCE = 1e-4;
const HALF_TURN_TOLERANCE = 0.01;

const round2 = (value: number): number => {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
};

const isNear = (a: number, b: number): boolean => Math.abs(a - b) < ORTHONORMAL_TOLERANCE;

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const boundingBoxOf = ([[a, c], [b, d]]: Transform, width: number, height: number): Box => {
  const xs = [0, a * width, c * height, a * width + c * height];
  const ys = [0, b * width, d * height, b * width + d * height];
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: round2(minX),
    y: round2(minY),
    width: round2(Math.max(...xs) - minX),
    height: round2(Math.max(...ys) - minY),
  };
};

export interface Orientation {
  readonly flipped: boolean;
  readonly cssTransform: string | undefined;
}

const flippedTransform = (deg: number): string => {
  if (Math.abs(Math.abs(deg) - 180) < HALF_TURN_TOLERANCE) return 'scaleX(-1)';
  return deg === 0 ? 'scaleY(-1)' : `rotate(${deg}deg) scaleY(-1)`;
};

export const orientationOf = ([[a, c], [b, d]]: Transform): Orientation => {
  const flipped = a * d - b * c < 0;
  const isOrthonormal =
    isNear(a * a + b * b, 1) && isNear(c * c + d * d, 1) && isNear(a * c + b * d, 0);
  if (!isOrthonormal) {
    return { flipped, cssTransform: `matrix(${[a, b, c, d].map(round2).join(', ')}, 0, 0)` };
  }
  const deg = round2((Math.atan2(b, a) * 180) / Math.PI);
  if (flipped) return { flipped, cssTransform: flippedTransform(deg) };
  return { flipped, cssTransform: deg === 0 ? undefined : `rotate(${deg}deg)` };
};
