export type FlipAxis = 'HORIZONTAL' | 'VERTICAL';

export const flipped = (
  [[a, c, e], [b, d, f]]: Transform,
  width: number,
  height: number,
  axis: FlipAxis,
): Transform => {
  const centreX = (a * width) / 2 + (c * height) / 2 + e;
  const centreY = (b * width) / 2 + (d * height) / 2 + f;
  return axis === 'HORIZONTAL'
    ? [
        [-a, -c, centreX + (a * width) / 2 + (c * height) / 2],
        [b, d, f],
      ]
    : [
        [a, c, e],
        [-b, -d, centreY + (b * width) / 2 + (d * height) / 2],
      ];
};
