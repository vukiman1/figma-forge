export interface LinearMap {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

export type Vector = readonly [number, number];

export const IDENTITY_MAP: LinearMap = { a: 1, b: 0, c: 0, d: 1 };

const SINGULAR_DETERMINANT = 1e-9;

export const linearPartOf = (transform: Transform): LinearMap => ({
  a: transform[0][0],
  c: transform[0][1],
  b: transform[1][0],
  d: transform[1][1],
});

export const translationOf = (transform: Transform): Vector => [transform[0][2], transform[1][2]];

export const composeMaps = (outer: LinearMap, inner: LinearMap): LinearMap => ({
  a: outer.a * inner.a + outer.c * inner.b,
  b: outer.b * inner.a + outer.d * inner.b,
  c: outer.a * inner.c + outer.c * inner.d,
  d: outer.b * inner.c + outer.d * inner.d,
});

export const invertMap = (map: LinearMap): LinearMap | null => {
  const det = map.a * map.d - map.b * map.c;
  if (Math.abs(det) < SINGULAR_DETERMINANT) return null;
  return { a: map.d / det, b: -map.b / det, c: -map.c / det, d: map.a / det };
};

export const mapVector = (map: LinearMap, [x, y]: Vector): Vector => [
  map.a * x + map.c * y,
  map.b * x + map.d * y,
];
