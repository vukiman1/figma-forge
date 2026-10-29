import { MIXED } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { serializePaint } from '../../src/serialize/paint.js';
import { serializeFlatSync } from '../../src/serialize/serialize-node.js';
import { fake } from './serialize-fake.js';

describe('serializeFlat', () => {
  it("derives a CSS angle for a linear gradient from the owning node's proportions", () => {
    const gradient = {
      type: 'GRADIENT_LINEAR',
      visible: true,
      opacity: 1,
      gradientStops: [
        { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
        { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
      ],
      gradientTransform: [
        [0.5, 0.5, 0],
        [0, 1, 0],
      ],
    };
    const wide = serializeFlatSync(fake({ width: 400, height: 100, fills: [gradient] }));
    const square = serializeFlatSync(fake({ width: 200, height: 200, fills: [gradient] }));
    expect((wide.fills as readonly { cssAngle?: number }[])[0]?.cssAngle).toBe(165.96);
    expect((square.fills as readonly { cssAngle?: number }[])[0]?.cssAngle).toBe(135);
    expect(
      (wide.fills as readonly { gradientTransform?: number[][] }[])[0]?.gradientTransform,
    ).toEqual([
      [0.5, 0.5, 0],
      [0, 1, 0],
    ]);
  });

  it('omits cssAngle for gradient types that are not an angle in CSS', () => {
    for (const type of ['GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND']) {
      const out = serializeFlatSync(
        fake({
          width: 400,
          height: 100,
          fills: [
            {
              type,
              visible: true,
              opacity: 1,
              gradientStops: [{ position: 0, color: { r: 1, g: 0, b: 0, a: 1 } }],
              gradientTransform: [
                [0.5, 0.5, 0],
                [0, 1, 0],
              ],
            },
          ],
        }),
      );
      expect((out.fills as readonly { cssAngle?: number }[])[0]?.cssAngle).toBeUndefined();
    }
  });

  it('marks fills=mixed when value is not an array', () => {
    const out = serializeFlatSync(fake({ fills: Symbol('figma.mixed') }));
    expect(out.fills).toBe(MIXED);
  });

  it('serializes a gradient paint with its stops and transform', () => {
    const out = serializeFlatSync(
      fake({
        fills: [
          {
            type: 'GRADIENT_LINEAR',
            visible: true,
            opacity: 0.8,
            gradientStops: [
              { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
              { position: 1, color: { r: 0, g: 0, b: 1, a: 0.5 } },
            ],
            gradientTransform: [
              [1, 0, 0],
              [0, 1, 0],
            ],
          },
        ],
      }),
    );
    expect(out.fills).toEqual([
      {
        type: 'GRADIENT_LINEAR',
        visible: true,
        opacity: 0.8,
        cssAngle: 90,
        gradientStops: [
          { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 1, a: 0.5 } },
        ],
        gradientTransform: [
          [1, 0, 0],
          [0, 1, 0],
        ],
      },
    ]);
  });

  it('carries scaleMode on an IMAGE fill (object-fit equivalent)', () => {
    const out = serializeFlatSync(
      fake({ fills: [{ type: 'IMAGE', visible: true, opacity: 1, scaleMode: 'FILL' }] }),
    );
    expect(out.fills).toEqual([{ type: 'IMAGE', visible: true, opacity: 1, scaleMode: 'FILL' }]);
  });

  it('carries a CROP fill’s matrix and the CSS that reproduces it, and nothing for other modes', () => {
    const image = (
      scaleMode: string,
      imageTransform: number[][],
      size = { width: 200, height: 200 },
    ) =>
      serializeFlatSync(
        fake({
          ...size,
          fills: [{ type: 'IMAGE', visible: true, opacity: 1, scaleMode, imageTransform }],
        }),
      ).fills?.[0];
    expect(
      image('CROP', [
        [0.5, 0, 0.25],
        [0, 0.5, 0.25],
      ]),
    ).toMatchObject({
      imageTransform: [
        [0.5, 0, 0.25],
        [0, 0.5, 0.25],
      ],
      cssTransform: 'translate(-50%, -50%) scale(2, 2)',
    });
    expect(
      image('CROP', [
        [0.6000000238418579, 0, 0.4000000059604645],
        [0, 0.800000011920929, 0],
      ]),
    ).toMatchObject({
      imageTransform: [
        [0.6, 0, 0.4],
        [0, 0.8, 0],
      ],
      cssTransform: 'translate(-66.6667%, 0%) scale(1.6667, 1.25)',
    });
    const rotated = [
      [0.5, 0.2, 0.1],
      [-0.2, 0.5, 0.3],
    ];
    expect(image('CROP', rotated)).toMatchObject({
      cssTransform: 'translate(3.4483%, -58.6207%) matrix(1.7241, 0.6897, -0.6897, 1.7241, 0, 0)',
    });
    expect(image('CROP', rotated, { width: 400, height: 200 })).toMatchObject({
      cssTransform: 'translate(3.4483%, -58.6207%) matrix(1.7241, 0.3448, -1.3793, 1.7241, 0, 0)',
    });
    expect(
      image('CROP', [
        [0, 0, 0.5],
        [0, 0, 0.5],
      ]),
    ).not.toHaveProperty('cssTransform');
    for (const mode of ['FILL', 'FIT', 'TILE']) {
      const out = image(mode, [
        [1, 0, 0],
        [0, 1, 0],
      ]);
      expect(out).not.toHaveProperty('imageTransform');
      expect(out).not.toHaveProperty('cssTransform');
    }
  });

  it('drops a rotated crop’s CSS where there is no owner to take the aspect ratio from', () => {
    const paint = {
      type: 'IMAGE',
      visible: true,
      opacity: 1,
      scaleMode: 'CROP',
      imageTransform: [
        [0.5, 0.2, 0.1],
        [-0.2, 0.5, 0.3],
      ],
    } as unknown as Paint;
    const out = serializePaint(paint, null);
    expect(out).toHaveProperty('imageTransform');
    expect(out).not.toHaveProperty('cssTransform');
    const flat = serializePaint(
      {
        ...paint,
        imageTransform: [
          [0.5, 0, 0.25],
          [0, 0.5, 0.25],
        ],
      } as unknown as Paint,
      null,
    );
    expect(flat).toMatchObject({ cssTransform: 'translate(-50%, -50%) scale(2, 2)' });
  });

  it('flags an IMAGE fill with non-zero adjustments; untouched filters stay clean', () => {
    const graded = serializeFlatSync(
      fake({
        fills: [
          {
            type: 'IMAGE',
            visible: true,
            opacity: 1,
            scaleMode: 'FILL',
            filters: { exposure: 0.3, contrast: 0, saturation: 0 },
          },
        ],
      }),
    );
    expect(graded.fills?.[0]).toMatchObject({ filtersApplied: true });

    const untouched = serializeFlatSync(
      fake({
        fills: [
          {
            type: 'IMAGE',
            visible: true,
            opacity: 1,
            scaleMode: 'FILL',
            filters: { exposure: 0, contrast: 0 },
          },
        ],
      }),
    );
    expect(untouched.fills?.[0]).not.toHaveProperty('filtersApplied');
  });
});
