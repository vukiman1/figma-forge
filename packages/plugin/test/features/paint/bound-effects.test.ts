import { describe, expect, it, vi } from 'vitest';

import { toFigmaEffectsBound } from '../../../src/features/paint/bound-effects.js';

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

const shadow = (over: Record<string, unknown> = {}) => ({
  type: 'DROP_SHADOW',
  visible: true,
  radius: 4,
  color: { r: 0, g: 0, b: 0, a: 0.2 },
  offset: { x: 0, y: 2 },
  spread: 0,
  ...over,
});

describe('toFigmaEffectsBound', () => {
  it('applies every bound field, chaining the new object each setter returns', async () => {
    const ctx = fakeFigma({ 'V:c': VAR('V:c'), 'V:n': VAR('V:n', 'FLOAT') });
    const out = await toFigmaEffectsBound(
      ctx,
      [shadow({ boundVariables: { color: 'V:c', radius: 'V:n' } })] as never,
      'set_effects',
    );
    expect(ctx.variables.setBoundVariableForEffect).toHaveBeenCalledTimes(2);
    expect(out[0]).toMatchObject({
      boundVariables: {
        color: { type: 'VARIABLE_ALIAS', id: 'V:c' },
        radius: { type: 'VARIABLE_ALIAS', id: 'V:n' },
      },
    });
  });

  it('passes the field through untranslated, so a newly bindable field needs no change here', async () => {
    const ctx = fakeFigma({ 'V:n': VAR('V:n', 'FLOAT') });
    await toFigmaEffectsBound(
      ctx,
      [shadow({ boundVariables: { offsetX: 'V:n' } })] as never,
      'set_effects',
    );
    expect(ctx.variables.setBoundVariableForEffect).toHaveBeenCalledWith(
      expect.anything(),
      'offsetX',
      expect.objectContaining({ id: 'V:n' }),
    );
  });

  it('rejects an unresolvable id before touching the setter', async () => {
    const ctx = fakeFigma({});
    await expect(
      toFigmaEffectsBound(
        ctx,
        [shadow({ boundVariables: { color: 'V:x' } })] as never,
        'set_effects',
      ),
    ).rejects.toThrow('set_effects: variable V:x not found');
    expect(ctx.variables.setBoundVariableForEffect).not.toHaveBeenCalled();
  });
});
