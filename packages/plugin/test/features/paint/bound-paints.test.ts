import { describe, expect, it, vi } from 'vitest';

import { toFigmaPaintsBound } from '../../../src/features/paint/bound-paints.js';

const VAR = (id: string, resolvedType = 'COLOR') => ({ id, name: `var/${id}`, resolvedType });

const fakeFigma = (variables: Record<string, unknown>) => {
  const ctx = {
    variables: {
      getVariableByIdAsync: vi.fn<(id: string) => Promise<unknown>>(
        async (id: string) => variables[id] ?? null,
      ),
      setBoundVariableForPaint: vi.fn<(p: object, f: string, v: { id: string }) => object>(
        (paint: object, field: string, variable: { id: string }) => ({
          ...paint,
          boundVariables: {
            ...(paint as { boundVariables?: object }).boundVariables,
            [field]: { type: 'VARIABLE_ALIAS', id: variable.id },
          },
        }),
      ),
      setBoundVariableForEffect: vi.fn<(e: object, f: string, v: { id: string }) => object>(
        (effect: object, field: string, variable: { id: string }) => ({
          ...effect,
          boundVariables: {
            ...(effect as { boundVariables?: object }).boundVariables,
            [field]: { type: 'VARIABLE_ALIAS', id: variable.id },
          },
        }),
      ),
      setBoundVariableForLayoutGrid: vi.fn<(g: object, f: string, v: { id: string }) => object>(
        (grid: object, field: string, variable: { id: string }) => ({
          ...grid,
          boundVariables: {
            ...(grid as { boundVariables?: object }).boundVariables,
            [field]: { type: 'VARIABLE_ALIAS', id: variable.id },
          },
        }),
      ),
    },
  };
  return ctx as unknown as typeof figma & { variables: typeof ctx.variables };
};

const solid = (over: Record<string, unknown> = {}) => ({
  type: 'SOLID' as const,
  visible: true,
  opacity: 1,
  color: { r: 1, g: 0, b: 0 },
  ...over,
});

const gradient = (stops: unknown[]) => ({
  type: 'GRADIENT_LINEAR' as const,
  visible: true,
  opacity: 1,
  gradientTransform: [
    [1, 0, 0],
    [0, 1, 0],
  ],
  gradientStops: stops,
});

describe('toFigmaPaintsBound', () => {
  it('binds a solid paint through the official setter, not by embedding an alias', async () => {
    const ctx = fakeFigma({ 'V:1': VAR('V:1') });
    const out = await toFigmaPaintsBound(
      ctx,
      [solid({ boundVariables: { color: 'V:1' } })] as never,
      'set_fills',
    );
    expect(ctx.variables.setBoundVariableForPaint).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SOLID' }),
      'color',
      expect.objectContaining({ id: 'V:1' }),
    );
    expect(out[0]).toMatchObject({
      boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'V:1' } },
    });
  });

  it('leaves an unbound paint exactly as the plain converter produced it', async () => {
    const ctx = fakeFigma({});
    const out = await toFigmaPaintsBound(ctx, [solid()] as never, 'set_fills');
    expect(ctx.variables.setBoundVariableForPaint).not.toHaveBeenCalled();
    expect(ctx.variables.getVariableByIdAsync).not.toHaveBeenCalled();
    expect(out[0]).not.toHaveProperty('boundVariables');
  });

  it('binds a gradient stop by embedding the alias (Figma exposes no setter for one)', async () => {
    const ctx = fakeFigma({ 'V:1': VAR('V:1') });
    const out = (await toFigmaPaintsBound(
      ctx,
      [
        gradient([
          { position: 0, color: { r: 1, g: 1, b: 1, a: 1 }, boundVariables: { color: 'V:1' } },
          { position: 1, color: { r: 0, g: 0, b: 0, a: 1 } },
        ]),
      ] as never,
      'set_fills',
    )) as unknown as { gradientStops: { boundVariables?: unknown }[] }[];
    expect(ctx.variables.setBoundVariableForPaint).not.toHaveBeenCalled();
    expect(out[0]?.gradientStops[0]?.boundVariables).toEqual({
      color: { type: 'VARIABLE_ALIAS', id: 'V:1' },
    });
    expect(out[0]?.gradientStops[1]).not.toHaveProperty('boundVariables');
  });

  it('rejects a non-COLOR variable on a gradient stop, which Figma would accept silently', async () => {
    const ctx = fakeFigma({ 'V:n': VAR('V:n', 'FLOAT') });
    await expect(
      toFigmaPaintsBound(
        ctx,
        [
          gradient([
            { position: 0, color: { r: 1, g: 1, b: 1, a: 1 }, boundVariables: { color: 'V:n' } },
          ]),
        ] as never,
        'set_fills',
      ),
    ).rejects.toThrow(/gradient stop colour takes a COLOR variable; var\/V:n is FLOAT/);
  });

  it('rejects an id that resolves to no variable', async () => {
    const ctx = fakeFigma({});
    await expect(
      toFigmaPaintsBound(
        ctx,
        [solid({ boundVariables: { color: 'V:gone' } })] as never,
        'set_fills',
      ),
    ).rejects.toThrow('set_fills: variable V:gone not found');
  });

  it('resolves before binding anything, so a bad id in a later paint aborts the whole array', async () => {
    const ctx = fakeFigma({ 'V:1': VAR('V:1') });
    await expect(
      toFigmaPaintsBound(
        ctx,
        [
          solid({ boundVariables: { color: 'V:1' } }),
          solid({ boundVariables: { color: 'V:no' } }),
        ] as never,
        'set_fills',
      ),
    ).rejects.toThrow('variable V:no not found');
    expect(ctx.variables.setBoundVariableForPaint).not.toHaveBeenCalled();
  });

  it('looks each distinct variable up once, however many paints cite it', async () => {
    const ctx = fakeFigma({ 'V:1': VAR('V:1') });
    await toFigmaPaintsBound(
      ctx,
      [
        solid({ boundVariables: { color: 'V:1' } }),
        solid({ boundVariables: { color: 'V:1' } }),
        gradient([
          { position: 0, color: { r: 0, g: 0, b: 0, a: 1 }, boundVariables: { color: 'V:1' } },
        ]),
      ] as never,
      'set_fills',
    );
    expect(ctx.variables.getVariableByIdAsync).toHaveBeenCalledTimes(1);
  });
});
