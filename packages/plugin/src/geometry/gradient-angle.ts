type Matrix2x3 = readonly (readonly number[])[];

const DEGREES_PER_TURN = 360;
const ANGLE_STEPS_PER_DEGREE = 100;

const isPositiveSize = (width: number, height: number): boolean =>
  Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;

const rampAxisOf = (transform: Matrix2x3): readonly [number, number] | null => {
  const [row, second] = transform;
  if (transform.length !== 2 || row?.length !== 3 || second?.length !== 3) return null;
  const [a, b] = row;
  if (a === undefined || b === undefined || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  return [a, b];
};

export const cssAngleFromGradientTransform = (
  transform: Matrix2x3,
  width: number,
  height: number,
): number | undefined => {
  const axis = isPositiveSize(width, height) ? rampAxisOf(transform) : null;
  if (axis === null) return undefined;
  const dx = axis[0] / width;
  const dy = axis[1] / height;
  if (dx === 0 && dy === 0) return undefined;
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const normalized = ((deg % DEGREES_PER_TURN) + DEGREES_PER_TURN) % DEGREES_PER_TURN;
  return Math.round(normalized * ANGLE_STEPS_PER_DEGREE) / ANGLE_STEPS_PER_DEGREE;
};
