import { describe, expect, it } from 'vitest';

import { cssAngleFromGradientTransform } from '../../src/geometry/gradient-angle.js';

const HORIZONTAL = [
  [1, 0, 0],
  [0, 1, 0],
];

const DIAGONAL = [
  [0.5, 0.5, 0],
  [0, 1, 0],
];

describe('cssAngleFromGradientTransform', () => {
  describe('aspect-ratio dependence (the reason this is computed here at all)', () => {
    it('gives the same matrix a different angle on a differently shaped node', () => {
      expect(cssAngleFromGradientTransform(DIAGONAL, 400, 100)).not.toBe(
        cssAngleFromGradientTransform(DIAGONAL, 200, 200),
      );
    });

    it('is scale-invariant — only the ratio of width to height moves the angle', () => {
      expect(cssAngleFromGradientTransform(DIAGONAL, 200, 200)).toBe(
        cssAngleFromGradientTransform(DIAGONAL, 900, 900),
      );
      expect(cssAngleFromGradientTransform(DIAGONAL, 400, 100)).toBe(
        cssAngleFromGradientTransform(DIAGONAL, 800, 200),
      );
    });

    it('leans the ramp toward the vertical as the node gets wider', () => {
      const square = cssAngleFromGradientTransform(DIAGONAL, 200, 200) ?? 0;
      const wide = cssAngleFromGradientTransform(DIAGONAL, 400, 100) ?? 0;
      const wider = cssAngleFromGradientTransform(DIAGONAL, 1600, 100) ?? 0;
      expect(wide).toBeGreaterThan(square);
      expect(wider).toBeGreaterThan(wide);
      expect(wider).toBeLessThan(180);
    });
  });

  describe('only the first row carries the ramp axis', () => {
    it('ignores the second row entirely, which only radial, angular and diamond gradients read', () => {
      const angle = cssAngleFromGradientTransform(HORIZONTAL, 400, 100);
      for (const secondRow of [
        [0, 1, 0],
        [-1, 1, 0],
        [7, -3, 2],
      ]) {
        expect(cssAngleFromGradientTransform([[1, 0, 0], secondRow], 400, 100)).toBe(angle);
      }
    });

    it('ignores the first row’s translation term', () => {
      expect(cssAngleFromGradientTransform(DIAGONAL, 400, 100)).toBe(
        cssAngleFromGradientTransform(
          [
            [0.5, 0.5, 0.25],
            [0, 1, 0],
          ],
          400,
          100,
        ),
      );
    });
  });

  describe('undefined rather than a fabricated angle', () => {
    it('omits the angle when the first row has no direction', () => {
      expect(
        cssAngleFromGradientTransform(
          [
            [0, 0, 0.5],
            [0, 1, 0],
          ],
          100,
          100,
        ),
      ).toBeUndefined();
    });

    it('omits the angle for a node with no area', () => {
      expect(cssAngleFromGradientTransform(HORIZONTAL, 0, 100)).toBeUndefined();
      expect(cssAngleFromGradientTransform(HORIZONTAL, 100, 0)).toBeUndefined();
      expect(cssAngleFromGradientTransform(HORIZONTAL, -50, 100)).toBeUndefined();
    });

    it('omits the angle for a matrix that is not 2×3', () => {
      expect(cssAngleFromGradientTransform([[1, 0, 0]], 100, 100)).toBeUndefined();
      expect(
        cssAngleFromGradientTransform(
          [
            [1, 0],
            [0, 1],
          ],
          100,
          100,
        ),
      ).toBeUndefined();
      expect(
        cssAngleFromGradientTransform(
          [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ],
          100,
          100,
        ),
      ).toBeUndefined();
    });

    it('omits the angle for non-finite input', () => {
      expect(cssAngleFromGradientTransform(HORIZONTAL, Number.NaN, 100)).toBeUndefined();
      expect(
        cssAngleFromGradientTransform(HORIZONTAL, 100, Number.POSITIVE_INFINITY),
      ).toBeUndefined();
      expect(
        cssAngleFromGradientTransform(
          [
            [Number.NaN, 0, 0],
            [0, 1, 0],
          ],
          100,
          100,
        ),
      ).toBeUndefined();
    });
  });

  describe('CSS angle conventions', () => {
    it('is always normalized into [0, 360)', () => {
      const matrices = [
        HORIZONTAL,
        DIAGONAL,
        [
          [-1, 0, 0],
          [0, 1, 0],
        ],
        [
          [0, -1, 0],
          [1, 0, 0],
        ],
        [
          [-0.5, -0.5, 0],
          [0, 1, 0],
        ],
      ];
      for (const m of matrices) {
        const angle = cssAngleFromGradientTransform(m, 300, 150);
        expect(angle).toBeDefined();
        expect(angle).toBeGreaterThanOrEqual(0);
        expect(angle).toBeLessThan(360);
      }
    });

    it('reverses by 180deg when the ramp is negated', () => {
      const forward = cssAngleFromGradientTransform(DIAGONAL, 400, 100) ?? 0;
      const backward =
        cssAngleFromGradientTransform(
          [
            [-0.5, -0.5, 1],
            [0, 1, 0],
          ],
          400,
          100,
        ) ?? 0;
      expect(Math.abs(forward - backward)).toBeCloseTo(180, 6);
    });

    it('rounds to two decimals', () => {
      const angle = cssAngleFromGradientTransform(DIAGONAL, 400, 100);
      expect(angle).toBe(Math.round((angle ?? 0) * 100) / 100);
    });
  });

  describe('pinsFigmaConvention', () => {
    it('reads a first row of (1, 0) as a left-to-right ramp', () => {
      expect(cssAngleFromGradientTransform(HORIZONTAL, 200, 200)).toBe(90);
      expect(
        cssAngleFromGradientTransform(
          [
            [1, 0, 0],
            [-1, 1, 0],
          ],
          200,
          200,
        ),
      ).toBe(90);
    });

    it('reads the diagonal ramp as 135deg on a square', () => {
      expect(cssAngleFromGradientTransform(DIAGONAL, 200, 200)).toBe(135);
    });

    it('reads the same diagonal ramp as 165.96deg on a 400×100 node', () => {
      expect(cssAngleFromGradientTransform(DIAGONAL, 400, 100)).toBe(165.96);
    });
  });
});
