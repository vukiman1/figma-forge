export type Affine = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
];

export type Vector = readonly [number, number];

const SINGULAR_DETERMINANT = 1e-12;

export const IDENTITY: Affine = [
  [1, 0, 0],
  [0, 1, 0],
];

export const translation = (x: number, y: number): Affine => [
  [1, 0, x],
  [0, 1, y],
];

export const compose = (outer: Affine, inner: Affine): Affine => {
  const [[a1, c1, e1], [b1, d1, f1]] = outer;
  const [[a2, c2, e2], [b2, d2, f2]] = inner;
  return [
    [a1 * a2 + c1 * b2, a1 * c2 + c1 * d2, a1 * e2 + c1 * f2 + e1],
    [b1 * a2 + d1 * b2, b1 * c2 + d1 * d2, b1 * e2 + d1 * f2 + f1],
  ];
};

export const invert = (m: Affine): Affine | null => {
  const [[a, c, e], [b, d, f]] = m;
  const det = a * d - b * c;
  if (!Number.isFinite(det) || Math.abs(det) < SINGULAR_DETERMINANT) return null;
  return [
    [d / det, -c / det, (c * f - d * e) / det],
    [-b / det, a / det, (b * e - a * f) / det],
  ];
};

export const applyToPoint = (m: Affine, [x, y]: Vector): Vector => [
  m[0][0] * x + m[0][1] * y + m[0][2],
  m[1][0] * x + m[1][1] * y + m[1][2],
];

export const applyToVector = (m: Affine, [x, y]: Vector): Vector => [
  m[0][0] * x + m[0][1] * y,
  m[1][0] * x + m[1][1] * y,
];

export const linearPartOf = ([[a, c], [b, d]]: Affine): Affine => [
  [a, c, 0],
  [b, d, 0],
];

export const translationOf = (m: Affine): Vector => [m[0][2], m[1][2]];

export const toTransform = ([[a, c, e], [b, d, f]]: Affine): Transform => [
  [a, c, e],
  [b, d, f],
];
