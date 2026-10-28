import { MIXED } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { serializeFlatSync } from '../../src/serialize/serialize-node.js';
import { fake } from './serialize-fake.js';

describe('serializeFlat — strokes / effects / auto layout', () => {
  it('serializes strokes with weight and align', () => {
    const out = serializeFlatSync(
      fake({
        strokes: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
        strokeWeight: 2,
        strokeAlign: 'INSIDE',
      }),
    );
    expect(out.strokes).toEqual([
      { type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } },
    ]);
    expect(out.strokeWeight).toBe(2);
    expect(out.strokeAlign).toBe('INSIDE');
  });

  it('marks strokeWeight=mixed when not a number', () => {
    const out = serializeFlatSync(
      fake({
        strokes: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
        strokeWeight: Symbol('figma.mixed'),
      }),
    );
    expect(out.strokeWeight).toBe(MIXED);
  });

  it('surfaces dashPattern / non-default strokeCap / strokeJoin on a dashed stroke', () => {
    const out = serializeFlatSync(
      fake({
        strokes: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
        strokeWeight: 1,
        dashPattern: [4, 2],
        strokeCap: 'ROUND',
        strokeJoin: 'ROUND',
      }),
    );
    expect(out.dashPattern).toEqual([4, 2]);
    expect(out.strokeCap).toBe('ROUND');
    expect(out.strokeJoin).toBe('ROUND');
  });

  it('omits dashPattern (empty=solid) and the no-op strokeCap NONE / strokeJoin MITER', () => {
    const out = serializeFlatSync(
      fake({
        strokes: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
        strokeWeight: 1,
        dashPattern: [],
        strokeCap: 'NONE',
        strokeJoin: 'MITER',
      }),
    );
    expect(out.dashPattern).toBeUndefined();
    expect(out.strokeCap).toBeUndefined();
    expect(out.strokeJoin).toBeUndefined();
  });

  it('surfaces per-side strokeWeights when strokeWeight is mixed (e.g. a top/bottom-only border)', () => {
    const out = serializeFlatSync(
      fake({
        strokes: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
        strokeWeight: Symbol('figma.mixed'),
        strokeTopWeight: 1,
        strokeRightWeight: 0,
        strokeBottomWeight: 1,
        strokeLeftWeight: 0,
      }),
    );
    expect(out.strokeWeight).toBe(MIXED);
    expect(out.strokeWeights).toEqual({ top: 1, right: 0, bottom: 1, left: 0 });
  });

  it('omits strokeWeights when per-side weights are unavailable (not all numeric)', () => {
    const out = serializeFlatSync(
      fake({
        strokes: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 0, g: 0, b: 0 } }],
        strokeWeight: Symbol('figma.mixed'),
      }),
    );
    expect(out.strokeWeights).toBeUndefined();
  });

  it('omits stroke fields when strokes is empty', () => {
    const out = serializeFlatSync(fake({ strokes: [], strokeWeight: 1 }));
    expect(out.strokes).toBeUndefined();
    expect(out.strokeWeight).toBeUndefined();
  });

  it('serializes effects', () => {
    const out = serializeFlatSync(
      fake({
        effects: [
          {
            type: 'DROP_SHADOW',
            visible: true,
            radius: 4,
            color: { r: 0, g: 0, b: 0, a: 0.2 },
            offset: { x: 0, y: 2 },
            spread: 0,
            blendMode: 'NORMAL',
          },
        ],
      }),
    );
    expect(out.effects).toEqual([
      {
        type: 'DROP_SHADOW',
        visible: true,
        radius: 4,
        color: { r: 0, g: 0, b: 0, a: 0.2 },
        offset: { x: 0, y: 2 },
        spread: 0,
      },
    ]);
  });

  it('omits effects when empty', () => {
    expect(serializeFlatSync(fake({ effects: [] })).effects).toBeUndefined();
  });

  it('serializes auto layout for HORIZONTAL/VERTICAL layoutMode', () => {
    const out = serializeFlatSync(
      fake({
        type: 'FRAME',
        layoutMode: 'HORIZONTAL',
        paddingTop: 4,
        paddingRight: 8,
        paddingBottom: 4,
        paddingLeft: 8,
        itemSpacing: 12,
        primaryAxisAlignItems: 'CENTER',
        counterAxisAlignItems: 'MIN',
        layoutWrap: 'NO_WRAP',
      }),
    );
    expect(out.layout).toEqual({
      mode: 'HORIZONTAL',
      paddingTop: 4,
      paddingRight: 8,
      paddingBottom: 4,
      paddingLeft: 8,
      itemSpacing: 12,
      primaryAxisAlignItems: 'CENTER',
      counterAxisAlignItems: 'MIN',
      layoutWrap: 'NO_WRAP',
    });
  });

  it('carries reversed paint order and stroke-in-layout only when non-default', () => {
    const base = {
      type: 'FRAME',
      layoutMode: 'VERTICAL',
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      itemSpacing: -8,
      primaryAxisAlignItems: 'MIN',
      counterAxisAlignItems: 'MIN',
    };
    const reversed = serializeFlatSync(
      fake({ ...base, itemReverseZIndex: true, strokesIncludedInLayout: true }),
    );
    expect(reversed.layout).toMatchObject({
      itemReverseZIndex: true,
      strokesIncludedInLayout: true,
    });

    const plain = serializeFlatSync(
      fake({ ...base, itemReverseZIndex: false, strokesIncludedInLayout: false }),
    );
    expect(plain.layout).not.toHaveProperty('itemReverseZIndex');
    expect(plain.layout).not.toHaveProperty('strokesIncludedInLayout');
  });

  it('serializes WRAP cross-axis spacing + alignment (non-default only), skips them when not wrapping', () => {
    const base = {
      type: 'FRAME',
      layoutMode: 'HORIZONTAL',
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      itemSpacing: 8,
      primaryAxisAlignItems: 'MIN',
      counterAxisAlignItems: 'MIN',
    } as const;

    const wrapped = serializeFlatSync(
      fake({
        ...base,
        layoutWrap: 'WRAP',
        counterAxisSpacing: 16,
        counterAxisAlignContent: 'AUTO',
      }),
    );
    expect(wrapped.layout?.counterAxisSpacing).toBe(16);
    expect(wrapped.layout?.counterAxisAlignContent).toBeUndefined();

    const distributed = serializeFlatSync(
      fake({
        ...base,
        layoutWrap: 'WRAP',
        counterAxisSpacing: 30,
        counterAxisAlignContent: 'SPACE_BETWEEN',
      }),
    );
    expect(distributed.layout?.counterAxisSpacing).toBeUndefined();
    expect(distributed.layout?.counterAxisAlignContent).toBe('SPACE_BETWEEN');

    const column = serializeFlatSync(
      fake({
        ...base,
        layoutMode: 'VERTICAL',
        layoutWrap: 'WRAP',
        counterAxisSpacing: 30,
        counterAxisAlignContent: 'AUTO',
      }),
    );
    expect(column.layout).toMatchObject({
      mode: 'VERTICAL',
      layoutWrap: 'WRAP',
      counterAxisSpacing: 30,
    });

    const noWrap = serializeFlatSync(
      fake({
        ...base,
        layoutWrap: 'NO_WRAP',
        counterAxisSpacing: 16,
        counterAxisAlignContent: 'SPACE_BETWEEN',
      }),
    );
    expect(noWrap.layout?.counterAxisSpacing).toBeUndefined();
    expect(noWrap.layout?.counterAxisAlignContent).toBeUndefined();
  });
});
