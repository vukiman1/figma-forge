import { describe, expect, it, vi } from 'vitest';

import { toFigmaLayoutGridsBound } from '../../../src/features/layout/bound-layout-grids.js';

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
