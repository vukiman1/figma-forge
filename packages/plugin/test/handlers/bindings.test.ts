import { describe, expect, it, vi } from 'vitest';

import { toFigmaLayoutGridsBound } from '../../src/handlers/bindings.js';

// The write half of issue #164. Two measured facts shape every test here:
//
//  1. Figma accepts a binding embedded in a plain object literal — the only way to bind a gradient
//     stop, which has no setter — but that path validates almost nothing. An id matching no
//     variable, and a variable of the wrong resolved type, are both taken silently and then render
//     white. So the official setters are used wherever they exist, and the gradient stop is checked
//     here instead.
//  2. Writing an array back WITHOUT `boundVariables` clears whatever it was bound to, because Figma
//     replaces the whole array. That is the semantics these functions preserve — there is no
//     separate unbind path to test.

const VAR = (id: string, resolvedType = 'COLOR') => ({ id, name: `var/${id}`, resolvedType });

/** SetBoundVariableFor* return a NEW object; the fake records the call and marks the result. */
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

describe('toFigmaLayoutGridsBound', () => {
  it('binds a grid field through the official setter', async () => {
    const ctx = fakeFigma({ 'V:n': VAR('V:n', 'FLOAT') });
    const out = await toFigmaLayoutGridsBound(
      ctx,
      [
        {
          pattern: 'COLUMNS',
          visible: true,
          count: 12,
          gutterSize: 16,
          alignment: 'STRETCH',
          boundVariables: { gutterSize: 'V:n' },
        },
      ] as never,
      'set_layout_grids',
    );
    expect(ctx.variables.setBoundVariableForLayoutGrid).toHaveBeenCalledWith(
      expect.objectContaining({ pattern: 'COLUMNS' }),
      'gutterSize',
      expect.objectContaining({ id: 'V:n' }),
    );
    expect(out[0]).toMatchObject({
      boundVariables: { gutterSize: { type: 'VARIABLE_ALIAS', id: 'V:n' } },
    });
  });

  it('binds on the uniform GRID pattern too', async () => {
    const ctx = fakeFigma({ 'V:n': VAR('V:n', 'FLOAT') });
    await toFigmaLayoutGridsBound(
      ctx,
      [
        {
          pattern: 'GRID',
          visible: true,
          sectionSize: 8,
          boundVariables: { sectionSize: 'V:n' },
        },
      ] as never,
      'set_layout_grids',
    );
    expect(ctx.variables.setBoundVariableForLayoutGrid).toHaveBeenCalledWith(
      expect.objectContaining({ pattern: 'GRID' }),
      'sectionSize',
      expect.anything(),
    );
  });
});
