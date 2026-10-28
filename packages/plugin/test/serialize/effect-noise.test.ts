import { describe, expect, it } from 'vitest';

import { serializeEffect } from '../../src/serialize/effect.js';

describe('serializeEffect', () => {
  describe('NOISE', () => {
    it('reads a MONOTONE noise with a different size on each axis from its vector, since the scalar noiseSize is only X', () => {
      const out = serializeEffect(
        {
          type: 'NOISE',
          visible: true,
          boundVariables: {},
          noiseSize: 5,
          noiseSizeVector: { x: 5, y: 10 },
          noiseType: 'MONOTONE',
          color: { r: 0, g: 0, b: 0, a: 0.25 },
          density: 60,
        } as unknown as Effect,
        null,
      );
      expect(out).toEqual({
        type: 'NOISE',
        visible: true,
        noiseType: 'MONOTONE',
        noiseSizeVector: { x: 5, y: 10 },
        density: 60,
        color: { r: 0, g: 0, b: 0, a: 0.25 },
      });
    });

    it('reads a DUOTONE noise with both colours, and no colour space beside them', () => {
      const out = serializeEffect(
        {
          type: 'NOISE',
          visible: true,
          boundVariables: {},
          noiseSize: 0.5,
          noiseSizeVector: { x: 0.5, y: 0.5 },
          noiseType: 'DUOTONE',
          color: {
            r: 0.4,
            g: 0.06,
            b: 0.06,
            a: 0.25,
            sourceColor: { space: 'HSL', h: 0, s: 0.74, l: 0.23 },
          },
          secondaryColor: { r: 1, g: 1, b: 1, a: 0.25 },
          density: 1,
        } as unknown as Effect,
        null,
      );
      expect(out).toEqual({
        type: 'NOISE',
        visible: true,
        noiseType: 'DUOTONE',
        noiseSizeVector: { x: 0.5, y: 0.5 },
        density: 1,
        color: { r: 0.4, g: 0.06, b: 0.06, a: 0.25 },
        secondaryColor: { r: 1, g: 1, b: 1, a: 0.25 },
      });
    });

    it('reads a MULTITONE noise by its opacity, leaving out the colour it has no setting for', () => {
      const out = serializeEffect(
        {
          type: 'NOISE',
          visible: true,
          boundVariables: {},
          noiseSize: 4.5,
          noiseSizeVector: { x: 4.5, y: 4.5 },
          noiseType: 'MULTITONE',
          color: { r: 0, g: 0, b: 0, a: 0.25 },
          opacity: 0.699999988079071,
          density: 1,
        } as unknown as Effect,
        null,
      );
      expect(out).toEqual({
        type: 'NOISE',
        visible: true,
        noiseType: 'MULTITONE',
        noiseSizeVector: { x: 4.5, y: 4.5 },
        density: 1,
        opacity: 0.699999988079071,
      });
    });

    it('falls back to the scalar size on both axes when no vector is reported', () => {
      const out = serializeEffect(
        {
          type: 'NOISE',
          visible: true,
          noiseSize: 2,
          noiseType: 'MONOTONE',
          color: { r: 0, g: 0, b: 0, a: 1 },
          density: 0.5,
        } as unknown as Effect,
        null,
      );
      expect(out.noiseSizeVector).toEqual({ x: 2, y: 2 });
    });
  });
});
