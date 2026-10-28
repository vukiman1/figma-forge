import { describe, expect, it } from 'vitest';

import { serializeFlatSync } from '../../src/serialize/serialize-node.js';
import { fake } from './serialize-fake.js';

describe('orientation', () => {
  const mirrored = [
    [-1, 0, 100],
    [0, 1, 0],
  ];

  it('reports a mirrored node, and how to place it', () => {
    const out = serializeFlatSync(
      fake({ type: 'RECTANGLE', rotation: -180, relativeTransform: mirrored }),
    );
    expect(out).toMatchObject({ flipped: true, cssTransform: 'scaleX(-1)' });
  });

  it('writes a turned repeat group’s copies in its parent’s axes', () => {
    const turned = [
      [0, 1, 0],
      [-1, 0, 0],
    ];
    const out = serializeFlatSync(
      fake({
        type: 'TRANSFORM_GROUP',
        rotation: 90,
        relativeTransform: turned,
        absoluteTransform: turned,
        absoluteBoundingBox: { x: 0, y: -10, width: 10, height: 10 },
        absoluteRenderBounds: { x: 0, y: -30, width: 10, height: 30 },
        transformModifiers: [
          {
            type: 'REPEAT',
            repeatType: 'LINEAR',
            axis: 'HORIZONTAL',
            unitType: 'PIXELS',
            offset: 20,
            count: 2,
          },
        ],
        children: [{ width: 10, height: 10, absoluteTransform: turned }],
      }),
    );
    expect(out.repeatTransforms).toEqual(['translate(0px, -20px)']);
  });

  it.each(['GROUP', 'TRANSFORM_GROUP'])(
    'leaves a %s’s turn to its children, which already carry it',
    type => {
      const out = serializeFlatSync(
        fake({ type, rotation: -180, relativeTransform: mirrored, children: [] }),
      );
      expect(out.flipped).toBeUndefined();
      expect(out.cssTransform).toBeUndefined();
    },
  );
});
