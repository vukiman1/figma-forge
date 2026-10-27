import { describe, expect, it } from 'vitest';

import { toDocumentRgb, toDocumentRgba } from '../../src/features/color-space.js';

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

const noConversion = (profile: string | undefined): typeof figma =>
  ({
    root: profile === undefined ? {} : { documentColorProfile: profile },
    util: throwing('util'),
  }) as unknown as typeof figma;

describe('toDocumentRgb', () => {
  it('passes a colour with no space through as document channels', () => {
    expect(toDocumentRgb(untouchable, { r: 0.8, g: 0.4, b: 0.2 }, 'set_fills')).toStrictEqual({
      r: 0.8,
      g: 0.4,
      b: 0.2,
    });
  });

  it("has Figma convert an sRGB colour into a P3 document, keeping Figma's result whole", () => {
    const { figmaCtx, calls } = doc('DISPLAY_P3');
    const out = toDocumentRgb(figmaCtx, { r: 0.8, g: 0.4, b: 0.2, space: 'SRGB' }, 'set_fills');
    expect(calls).toEqual([{ space: 'SRGB', r: 0.8, g: 0.4, b: 0.2 }]);
    expect(out).toEqual({
      ...P3_OF_SRGB_ORANGE,
      sourceColor: { space: 'SRGB', r: 0.8, g: 0.4, b: 0.2 },
    });
  });

  it('has Figma convert a P3 colour into an sRGB document', () => {
    const { figmaCtx, calls } = doc('SRGB');
    toDocumentRgb(figmaCtx, { r: 1, g: 0, b: 0, space: 'DISPLAY_P3' }, 'set_fills');
    expect(calls).toEqual([{ space: 'DISPLAY_P3', r: 1, g: 0, b: 0 }]);
  });

  it.each([
    ['SRGB', 'SRGB'],
    ['SRGB', 'LEGACY'],
    ['SRGB', undefined],
    ['DISPLAY_P3', 'DISPLAY_P3'],
  ] as const)('writes a %s colour into a %s document unconverted', (space, profile) => {
    expect(
      toDocumentRgb(noConversion(profile), { r: 0.8, g: 0.4, b: 0.2, space }, 'set_fills'),
    ).toStrictEqual({ r: 0.8, g: 0.4, b: 0.2 });
  });

  it('refuses a space it cannot convert from, naming the tool', () => {
    const { figmaCtx, calls } = doc('DISPLAY_P3');
    expect(() =>
      toDocumentRgb(figmaCtx, { r: 0, g: 0, b: 0, space: 'OKLCH' }, 'set_fills'),
    ).toThrow(/set_fills: color space must be one of SRGB \/ DISPLAY_P3 — got OKLCH/);
    expect(calls).toEqual([]);
  });
});

describe('toDocumentRgba', () => {
  it('converts the channels and leaves alpha alone', () => {
    const { figmaCtx } = doc('DISPLAY_P3');
    const out = toDocumentRgba(figmaCtx, { r: 0.8, g: 0.4, b: 0.2, a: 0.5, space: 'SRGB' }, 'x');
    expect(out).toMatchObject({ ...P3_OF_SRGB_ORANGE, a: 0.5 });
  });
});
