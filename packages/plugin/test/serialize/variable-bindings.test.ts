import { describe, expect, it } from 'vitest';

import { serializeEffect } from '../../src/serialize/effect.js';
import { serializeLayoutGrid } from '../../src/serialize/layout-grid.js';
import { serializePaint } from '../../src/serialize/paint.js';
import { serializeFlatSync } from '../../src/serialize/serialize-node.js';
import { fake } from './serialize-fake.js';

describe('serializer — variable bindings on paints / effects / grids', () => {
  const ALIAS = { type: 'VARIABLE_ALIAS', id: 'VariableID:5157:5005' };
  const ALIAS2 = { type: 'VARIABLE_ALIAS', id: 'VariableID:5157:5006' };

  it('carries a bound colour on a solid paint', () => {
    const out = serializePaint(
      {
        type: 'SOLID',
        visible: true,
        opacity: 1,
        blendMode: 'NORMAL',
        color: { r: 0.1, g: 0.2, b: 0.3 },
        boundVariables: { color: ALIAS },
      } as unknown as Paint,
      null,
    );
    expect(out).toEqual({
      type: 'SOLID',
      visible: true,
      opacity: 1,
      color: { r: 0.1, g: 0.2, b: 0.3 },
      boundVariables: { color: 'VariableID:5157:5005' },
    });
  });

  it('omits the field on an unbound paint, including Figma’s empty boundVariables', () => {
    const empty = serializePaint(
      {
        type: 'SOLID',
        visible: true,
        opacity: 1,
        color: { r: 0, g: 1, b: 0 },
        boundVariables: {},
      } as unknown as Paint,
      null,
    );
    expect(empty).not.toHaveProperty('boundVariables');
    const absent = serializePaint(
      {
        type: 'SOLID',
        visible: true,
        opacity: 1,
        color: { r: 0, g: 1, b: 0 },
      } as unknown as Paint,
      null,
    );
    expect(absent).not.toHaveProperty('boundVariables');
  });

  it('binds gradient stops independently of each other', () => {
    const out = serializePaint(
      {
        type: 'GRADIENT_LINEAR',
        visible: true,
        opacity: 1,
        gradientTransform: [
          [1, 0, 0],
          [0, 1, 0],
        ],
        gradientStops: [
          { position: 0, color: { r: 0, g: 0, b: 0, a: 1 }, boundVariables: { color: ALIAS } },
          { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } },
        ],
      } as unknown as Paint,
      null,
    ) as { gradientStops: { boundVariables?: unknown }[] };
    expect(out.gradientStops[0]?.boundVariables).toEqual({ color: 'VariableID:5157:5005' });
    expect(out.gradientStops[1]).not.toHaveProperty('boundVariables');
  });

  it('carries every bound field on a shadow', () => {
    const out = serializeEffect(
      {
        type: 'DROP_SHADOW',
        visible: true,
        radius: 24,
        color: { r: 0.1, g: 0.2, b: 0.3, a: 1 },
        offset: { x: 0, y: 2 },
        spread: 0,
        blendMode: 'NORMAL',
        boundVariables: { color: ALIAS, radius: ALIAS2 },
      } as unknown as Effect,
      null,
    );
    expect(out.boundVariables).toEqual({
      color: 'VariableID:5157:5005',
      radius: 'VariableID:5157:5006',
    });
    expect(out.color).toEqual({ r: 0.1, g: 0.2, b: 0.3, a: 1 });
  });

  it('carries a bound radius on a blur (the non-shadow branch)', () => {
    const out = serializeEffect(
      {
        type: 'LAYER_BLUR',
        visible: true,
        radius: 8,
        boundVariables: { radius: ALIAS2 },
      } as unknown as Effect,
      null,
    );
    expect(out).toEqual({
      type: 'LAYER_BLUR',
      visible: true,
      radius: 8,
      boundVariables: { radius: 'VariableID:5157:5006' },
    });
  });

  it('carries bindings on both layout-grid branches', () => {
    const columns = serializeLayoutGrid({
      pattern: 'COLUMNS',
      visible: true,
      count: 12,
      gutterSize: 24,
      alignment: 'STRETCH',
      offset: 24,
      boundVariables: { gutterSize: ALIAS2 },
    } as unknown as LayoutGrid);
    expect(columns.boundVariables).toEqual({ gutterSize: 'VariableID:5157:5006' });
    const uniform = serializeLayoutGrid({
      pattern: 'GRID',
      visible: true,
      sectionSize: 8,
      boundVariables: { sectionSize: ALIAS2 },
    } as unknown as LayoutGrid);
    expect(uniform.boundVariables).toEqual({ sectionSize: 'VariableID:5157:5006' });
  });

  it('ignores a malformed alias rather than emitting a broken id', () => {
    const out = serializeEffect(
      {
        type: 'LAYER_BLUR',
        visible: true,
        radius: 8,
        boundVariables: {
          radius: { type: 'VARIABLE_ALIAS' },
          spread: { type: 'VARIABLE_ALIAS', id: 123 },
          color: null,
        },
      } as unknown as Effect,
      null,
    );
    expect(out).not.toHaveProperty('boundVariables');
  });

  it('keeps the well-formed bindings when a sibling field is malformed', () => {
    const out = serializeEffect(
      {
        type: 'LAYER_BLUR',
        visible: true,
        radius: 8,
        boundVariables: { radius: ALIAS2, color: { type: 'VARIABLE_ALIAS', id: 123 } },
      } as unknown as Effect,
      null,
    );
    expect(out.boundVariables).toEqual({ radius: 'VariableID:5157:5006' });
  });

  it('surfaces a bound fill through a node, alongside the node’s own coarse binding list', () => {
    const out = serializeFlatSync(
      fake({
        fills: [
          {
            type: 'SOLID',
            visible: true,
            opacity: 1,
            color: { r: 0.1, g: 0.2, b: 0.3 },
            boundVariables: { color: ALIAS },
          },
        ],
        boundVariables: { fills: [ALIAS] },
      }),
    );
    expect(out.boundVariables).toEqual({ fills: ['VariableID:5157:5005'] });
    expect(out.fills).toEqual([
      {
        type: 'SOLID',
        visible: true,
        opacity: 1,
        color: { r: 0.1, g: 0.2, b: 0.3 },
        boundVariables: { color: 'VariableID:5157:5005' },
      },
    ]);
  });
});
