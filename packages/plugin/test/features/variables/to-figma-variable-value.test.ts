import { describe, expect, it } from 'vitest';

import { toFigmaVariableValue } from '../../../src/features/variables/to-figma-variable-value.js';

const P3_OF_SRGB_ORANGE = { r: 0.7488, g: 0.4216, b: 0.2478 };

const doc = (profile: string): typeof figma =>
  ({
    root: { documentColorProfile: profile },
    util: { rgb: (color: unknown) => ({ ...P3_OF_SRGB_ORANGE, sourceColor: color }) },
  }) as unknown as typeof figma;

const untouchable = new Proxy(
  {},
  {
    get: () => {
      throw new Error('figma must not be read');
    },
  },
) as typeof figma;

describe('toFigmaVariableValue', () => {
  it('converts a COLOR value that names its space', () => {
    const figmaCtx = doc('DISPLAY_P3');
    const value = toFigmaVariableValue(
      { r: 0.8, g: 0.4, b: 0.2, a: 1, space: 'SRGB' } as never,
      figmaCtx,
    );
    expect(value).toStrictEqual({ ...P3_OF_SRGB_ORANGE, a: 1 });
  });

  it('converts the concrete half of a composed colour that names its space', () => {
    const figmaCtx = doc('DISPLAY_P3');
    const value = toFigmaVariableValue(
      {
        color: { r: 0.8, g: 0.4, b: 0.2, a: 1, space: 'SRGB' },
        opacity: { type: 'VARIABLE_ALIAS', id: 'VariableID:1:2' },
      } as never,
      figmaCtx,
    ) as VariableComposedColor;
    expect(value.color).toStrictEqual({ ...P3_OF_SRGB_ORANGE, a: 1 });
    expect(value.opacity).toEqual({ type: 'VARIABLE_ALIAS', id: 'VariableID:1:2' });
  });

  it('writes a COLOR value with no space exactly as before, alpha absent included', () => {
    expect(toFigmaVariableValue({ r: 0.1, g: 0.2, b: 0.3 }, untouchable)).toEqual({
      r: 0.1,
      g: 0.2,
      b: 0.3,
      a: undefined,
    });
  });
});
