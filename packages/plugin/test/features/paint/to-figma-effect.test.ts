import { describe, expect, it } from 'vitest';

import { toFigmaEffect } from '../../../src/features/paint/to-figma-effect.js';

const P3_OF_SRGB_ORANGE = { r: 0.7488, g: 0.4216, b: 0.2478 };

const throwing = (what: string): object =>
  new Proxy(
    {},
    {
      get: () => {
        throw new Error(`${what} must not be read`);
      },
    },
  );

const doc = (profile: string | undefined) => {
  const calls: unknown[] = [];
  const figmaCtx = {
    root: profile === undefined ? {} : { documentColorProfile: profile },
    util: {
      rgb: (color: unknown) => {
        calls.push(color);
        return { ...P3_OF_SRGB_ORANGE, sourceColor: color };
      },
    },
  } as unknown as typeof figma;
  return { figmaCtx, calls };
};

const untouchable = throwing('figma') as typeof figma;

describe('toFigmaEffect', () => {
  it('converts a shadow colour that names its space', () => {
    const { figmaCtx } = doc('DISPLAY_P3');
    const effect = toFigmaEffect(
      {
        type: 'DROP_SHADOW',
        visible: true,
        radius: 4,
        color: { r: 0.8, g: 0.4, b: 0.2, a: 0.25, space: 'SRGB' } as never,
        offset: { x: 0, y: 2 },
      },
      figmaCtx,
    ) as DropShadowEffect;
    expect(effect.color).toMatchObject({ ...P3_OF_SRGB_ORANGE, a: 0.25 });
  });

  it('writes a shadow colour with no space exactly as before', () => {
    const effect = toFigmaEffect(
      {
        type: 'INNER_SHADOW',
        visible: true,
        radius: 2,
        color: { r: 1, g: 1, b: 1, a: 1 },
        offset: { x: 0, y: 0 },
      },
      untouchable,
    );
    expect(effect).toEqual({
      type: 'INNER_SHADOW',
      visible: true,
      radius: 2,
      color: { r: 1, g: 1, b: 1, a: 1 },
      offset: { x: 0, y: 0 },
      spread: 0,
      blendMode: 'NORMAL',
    });
  });
});
