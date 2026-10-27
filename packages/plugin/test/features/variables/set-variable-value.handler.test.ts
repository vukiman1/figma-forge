import type { VariableResult } from '@figma-forge/core';
import { describe, expect, it, vi } from 'vitest';

import { createSetVariableValueHandler } from '../../../src/features/variables/set-variable-value.handler.js';

const fakeFigma = (variable: unknown): typeof figma =>
  ({ variables: { getVariableByIdAsync: async () => variable } }) as unknown as typeof figma;

describe('set_variable_value handler', () => {
  it('sets a color value for a mode (RGB normalised to RGBA pass-through)', async () => {
    const setValueForMode = vi.fn<() => void>();
    const variable = { id: 'V:0', name: 'color/primary', setValueForMode };
    const handler = createSetVariableValueHandler(fakeFigma(variable));
    const result = (await handler({
      variableId: 'V:0',
      modeId: 'M:0',
      value: { r: 1, g: 0, b: 0, a: 1 },
    })) as VariableResult;

    expect(setValueForMode).toHaveBeenCalledWith('M:0', { r: 1, g: 0, b: 0, a: 1 });
    expect(result).toEqual({ ok: true, variableId: 'V:0', name: 'color/primary' });
  });

  it('converts a VARIABLE_ALIAS value', async () => {
    const setValueForMode = vi.fn<() => void>();
    const variable = { id: 'V:0', name: 'x', setValueForMode };
    const handler = createSetVariableValueHandler(fakeFigma(variable));
    await handler({
      variableId: 'V:0',
      modeId: 'M:0',
      value: { type: 'VARIABLE_ALIAS', id: 'V:9' },
    });
    expect(setValueForMode).toHaveBeenCalledWith('M:0', { type: 'VARIABLE_ALIAS', id: 'V:9' });
  });

  it('coerces a stringified value back to the variable resolvedType', async () => {
    const cases: { resolvedType: string; raw: unknown; expected: unknown }[] = [
      { resolvedType: 'FLOAT', raw: '42', expected: 42 },
      { resolvedType: 'BOOLEAN', raw: 'true', expected: true },
      { resolvedType: 'BOOLEAN', raw: 'false', expected: false },
      {
        resolvedType: 'COLOR',
        raw: '{"r":0.2,"g":0.5,"b":1,"a":1}',
        expected: { r: 0.2, g: 0.5, b: 1, a: 1 },
      },
      { resolvedType: 'STRING', raw: 'hello', expected: 'hello' },
    ];
    for (const { resolvedType, raw, expected } of cases) {
      const setValueForMode = vi.fn<() => void>();
      const handler = createSetVariableValueHandler(
        fakeFigma({ id: 'V:0', name: 'x', resolvedType, setValueForMode }),
      );
      // eslint-disable-next-line no-await-in-loop -- small fixed table, sequential is fine
      await handler({ variableId: 'V:0', modeId: 'M:0', value: raw });
      expect(setValueForMode).toHaveBeenCalledWith('M:0', expected);
    }
  });

  it('passes a VARIABLE_ALIAS through for a FLOAT variable (not coerced to a number)', async () => {
    const setValueForMode = vi.fn<() => void>();
    const handler = createSetVariableValueHandler(
      fakeFigma({ id: 'V:0', name: 'radius/md', resolvedType: 'FLOAT', setValueForMode }),
    );
    await handler({
      variableId: 'V:0',
      modeId: 'M:0',
      value: { type: 'VARIABLE_ALIAS', id: 'V:9' },
    });
    expect(setValueForMode).toHaveBeenCalledWith('M:0', { type: 'VARIABLE_ALIAS', id: 'V:9' });
  });

  it('parses a stringified VARIABLE_ALIAS back for a FLOAT variable', async () => {
    const setValueForMode = vi.fn<() => void>();
    const handler = createSetVariableValueHandler(
      fakeFigma({ id: 'V:0', name: 'radius/md', resolvedType: 'FLOAT', setValueForMode }),
    );
    await handler({
      variableId: 'V:0',
      modeId: 'M:0',
      value: '{"type":"VARIABLE_ALIAS","id":"V:9"}',
    });
    expect(setValueForMode).toHaveBeenCalledWith('M:0', { type: 'VARIABLE_ALIAS', id: 'V:9' });
  });

  it('passes an EASING curve through instead of mangling it into an alias', async () => {
    const setValueForMode = vi.fn<() => void>();
    const handler = createSetVariableValueHandler(
      fakeFigma({ id: 'V:0', name: 'motion/enter', resolvedType: 'EASING', setValueForMode }),
    );
    await handler({
      variableId: 'V:0',
      modeId: 'M:0',
      value: { type: 'CUSTOM_SPRING', easingFunctionSpring: { bounce: 0.4 } },
    });
    expect(setValueForMode).toHaveBeenCalledWith('M:0', {
      type: 'CUSTOM_SPRING',
      easingFunctionSpring: { bounce: 0.4 },
    });
  });

  it('coerces a stringified TIMING value to a number, like FLOAT', async () => {
    const setValueForMode = vi.fn<() => void>();
    const handler = createSetVariableValueHandler(
      fakeFigma({ id: 'V:0', name: 'motion/duration', resolvedType: 'TIMING', setValueForMode }),
    );
    await handler({ variableId: 'V:0', modeId: 'M:0', value: '250' });
    expect(setValueForMode).toHaveBeenCalledWith('M:0', 250);
  });

  it('rejects a stringified FLOAT that is not a number', async () => {
    const variable = {
      id: 'V:0',
      name: 'x',
      resolvedType: 'FLOAT',
      setValueForMode: vi.fn<() => void>(),
    };
    await expect(
      createSetVariableValueHandler(fakeFigma(variable))({
        variableId: 'V:0',
        modeId: 'M:0',
        value: 'abc',
      }),
    ).rejects.toThrow(/not a number/);
  });

  it('throws when variable missing or input bad', async () => {
    await expect(
      createSetVariableValueHandler(fakeFigma(null))({
        variableId: 'V:9',
        modeId: 'M:0',
        value: 1,
      }),
    ).rejects.toThrow(/not found/);
    await expect(
      createSetVariableValueHandler(fakeFigma(null))({ variableId: 'V:0', modeId: 'M:0' }),
    ).rejects.toThrow(/value: Invalid input/);
  });

  it('converts a composed color, keeping each half as authored', async () => {
    const setValueForMode = vi.fn<() => void>();
    const handler = createSetVariableValueHandler(
      fakeFigma({ id: 'V:0', name: 'color/overlay', resolvedType: 'COLOR', setValueForMode }),
    );

    await handler({
      variableId: 'V:0',
      modeId: 'M:0',
      value: {
        color: { r: 1, g: 0, b: 0, a: 1, hex: '#FF0000' },
        opacity: { type: 'VARIABLE_ALIAS', id: 'V:9' },
      },
    });
    expect(setValueForMode).toHaveBeenCalledWith('M:0', {
      color: { r: 1, g: 0, b: 0, a: 1 },
      opacity: { type: 'VARIABLE_ALIAS', id: 'V:9' },
    });

    await handler({
      variableId: 'V:0',
      modeId: 'M:1',
      value: { color: { type: 'VARIABLE_ALIAS', id: 'V:brand' }, opacity: 0.5 },
    });
    expect(setValueForMode).toHaveBeenLastCalledWith('M:1', {
      color: { type: 'VARIABLE_ALIAS', id: 'V:brand' },
      opacity: 0.5,
    });
  });

  it('survives a composed color stringified in transit', async () => {
    const setValueForMode = vi.fn<() => void>();
    const handler = createSetVariableValueHandler(
      fakeFigma({ id: 'V:0', name: 'color/overlay', resolvedType: 'COLOR', setValueForMode }),
    );
    await handler({
      variableId: 'V:0',
      modeId: 'M:0',
      value: JSON.stringify({
        color: { type: 'VARIABLE_ALIAS', id: 'V:brand' },
        opacity: 0.5,
      }),
    });
    expect(setValueForMode).toHaveBeenCalledWith('M:0', {
      color: { type: 'VARIABLE_ALIAS', id: 'V:brand' },
      opacity: 0.5,
    });
  });

  it('refuses a composed color with no alias on either half', async () => {
    const setValueForMode = vi.fn<() => void>();
    const handler = createSetVariableValueHandler(
      fakeFigma({ id: 'V:0', name: 'color/overlay', resolvedType: 'COLOR', setValueForMode }),
    );
    await expect(
      handler({
        variableId: 'V:0',
        modeId: 'M:0',
        value: { color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 0.5 },
      }),
    ).rejects.toThrow(/at least one of color \/ opacity/);
    expect(setValueForMode).not.toHaveBeenCalled();
  });

  it('still reads a color carrying stray composed-color keys as a color', async () => {
    const setValueForMode = vi.fn<() => void>();
    const handler = createSetVariableValueHandler(
      fakeFigma({ id: 'V:0', name: 'color/primary', resolvedType: 'COLOR', setValueForMode }),
    );
    await handler({
      variableId: 'V:0',
      modeId: 'M:0',
      value: { r: 1, g: 0, b: 0, a: 1, color: 'not-an-object', opacity: 0.5 },
    });
    expect(setValueForMode).toHaveBeenCalledWith('M:0', { r: 1, g: 0, b: 0, a: 1 });
  });

  it("converts a colour value that names its space, through Figma's util", async () => {
    const setValueForMode = vi.fn<() => void>();
    const variable = { id: 'V:0', name: 'color/brand', resolvedType: 'COLOR', setValueForMode };
    const figmaCtx = {
      root: { documentColorProfile: 'DISPLAY_P3' },
      variables: { getVariableByIdAsync: async () => variable },
      util: { rgb: () => ({ r: 0.75, g: 0.42, b: 0.25, sourceColor: { space: 'SRGB' } }) },
    } as unknown as typeof figma;
    await createSetVariableValueHandler(figmaCtx)({
      variableId: 'V:0',
      modeId: 'M:0',
      value: { r: 0.8, g: 0.4, b: 0.2, a: 1, space: 'SRGB' },
    });
    expect(setValueForMode).toHaveBeenCalledWith('M:0', { r: 0.75, g: 0.42, b: 0.25, a: 1 });
  });
});
