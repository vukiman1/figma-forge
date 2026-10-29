import { MIXED } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { serializeFlatSync } from '../../src/serialize/serialize-node.js';
import { fake } from './serialize-fake.js';

describe('serializeFlat', () => {
  describe('a background blur Figma does not draw', () => {
    const blur = { type: 'BACKGROUND_BLUR', visible: true, radius: 16, blurType: 'NORMAL' };
    const solid = (opacity: number, visible = true) => ({
      type: 'SOLID',
      visible,
      opacity,
      color: { r: 1, g: 1, b: 1 },
    });
    const gradient = (a0: number, a1: number) => ({
      type: 'GRADIENT_LINEAR',
      visible: true,
      opacity: 1,
      gradientTransform: [
        [1, 0, 0],
        [0, 1, 0],
      ],
      gradientStops: [
        { position: 0, color: { r: 1, g: 1, b: 1, a: a0 } },
        { position: 1, color: { r: 1, g: 1, b: 1, a: a1 } },
      ],
    });
    const drawnOf = (fills: unknown[], effects: unknown[] = [blur]) =>
      serializeFlatSync(fake({ fills, effects })).effects?.map(e => e.drawn);

    it.each([
      ['no fill', []],
      ['a fully transparent fill', [solid(0)]],
      ['a hidden fill', [solid(1, false)]],
      ['a hidden fill and a transparent one', [solid(1, false), solid(0)]],
      ['a fully transparent gradient', [gradient(0, 0)]],
    ])('marks it behind %s', (_name, fills) => {
      expect(drawnOf(fills)).toEqual([false]);
    });

    it.each([
      ['a 1% fill', [solid(0.01)]],
      ['a gradient with one non-transparent stop', [gradient(0, 0.5)]],
    ])('leaves it unmarked behind %s', (_name, fills) => {
      expect(drawnOf(fills)).toEqual([undefined]);
    });

    it('marks only the background blur, and only a visible one', () => {
      const layer = { type: 'LAYER_BLUR', visible: true, radius: 4 };
      const hidden = { ...blur, visible: false };
      expect(drawnOf([], [layer, blur, hidden])).toEqual([undefined, false, undefined]);
    });
  });

  it.each([0.6, 1])('preserves corner smoothing %s through node serialization', value => {
    expect(serializeFlatSync(fake({ cornerRadius: 12, cornerSmoothing: value }))).toMatchObject({
      cornerRadius: 12,
      cornerSmoothing: value,
    });
  });

  it('omits the default corner smoothing 0, leaving the node exactly as it serialized before', () => {
    const out = serializeFlatSync(fake({ cornerRadius: 12, cornerSmoothing: 0 }));
    expect(out).toEqual(serializeFlatSync(fake({ cornerRadius: 12 })));
    expect('cornerSmoothing' in out).toBe(false);
  });

  it('reads fresh native values on every call rather than caching across snapshots', () => {
    const parent = { id: '1:1', layoutMode: 'HORIZONTAL' };
    const node = fake({
      parent,
      opacity: 0.25,
      layoutSizingHorizontal: 'FILL',
      constraints: { horizontal: 'CENTER', vertical: 'MIN' },
    });
    const first = serializeFlatSync(node);
    parent.layoutMode = 'NONE';
    Object.assign(node, { opacity: 0.75 });
    const second = serializeFlatSync(node);
    expect(first).toMatchObject({ opacity: 0.25, layoutSizingHorizontal: 'FILL' });
    expect(first.constraints).toBeUndefined();
    expect(second).toMatchObject({
      opacity: 0.75,
      constraints: { horizontal: 'CENTER', vertical: 'MIN' },
    });
    expect(second.layoutSizingHorizontal).toBeUndefined();
  });

  it('reads native layout and scalar getters once per node snapshot', () => {
    const reads: Record<string, number> = {};
    const tracked = (target: object, key: string, value: unknown, label = key): void => {
      Object.defineProperty(target, key, {
        get: () => {
          reads[label] = (reads[label] ?? 0) + 1;
          return value;
        },
        configurable: true,
        enumerable: true,
      });
    };
    const parent = { id: '1:1' };
    tracked(parent, 'layoutMode', 'GRID', 'parent.layoutMode');
    const node = fake({ type: 'FRAME' });
    for (const [key, value] of Object.entries({
      parent,
      rotation: 12,
      opacity: 0.75,
      layoutMode: 'HORIZONTAL',
      layoutWrap: 'WRAP',
      counterAxisSpacing: 20,
      counterAxisAlignContent: 'MIN',
      minWidth: 5,
      maxWidth: 50,
      minHeight: 6,
      maxHeight: 60,
      clipsContent: true,
    }))
      tracked(node, key, value);
    const out = serializeFlatSync(node);

    expect(out).toMatchObject({
      parentId: '1:1',
      rotation: 12,
      opacity: 0.75,
      layout: {
        mode: 'HORIZONTAL',
        layoutWrap: 'WRAP',
        counterAxisSpacing: 20,
        counterAxisAlignContent: 'MIN',
      },
      minWidth: 5,
      maxWidth: 50,
      minHeight: 6,
      maxHeight: 60,
      clipsContent: true,
    });
    expect(reads).toEqual(Object.fromEntries(Object.keys(reads).map(key => [key, 1])));
  });

  it('reads each native grid dimension only once without losing tracks or placement', () => {
    const reads: Record<string, number> = {};
    const node = fake({ type: 'FRAME' });
    for (const [key, value] of Object.entries({
      layoutMode: 'GRID',
      gridRowCount: 2,
      gridColumnCount: 3,
      gridRowGap: 8,
      gridColumnGap: 12,
      gridRowSizes: [{ type: 'FIXED', value: 30 }],
      gridColumnSizes: [{ type: 'FLEX', value: 1 }],
    })) {
      Object.defineProperty(node, key, {
        get: () => {
          reads[key] = (reads[key] ?? 0) + 1;
          return value;
        },
      });
    }
    expect(serializeFlatSync(node).layout).toMatchObject({
      mode: 'GRID',
      gridRowCount: 2,
      gridColumnCount: 3,
      gridRowGap: 8,
      gridColumnGap: 12,
      gridRowSizes: [{ type: 'FIXED', value: 30 }],
      gridColumnSizes: [{ type: 'FLEX', value: 1 }],
    });
    expect(reads).toEqual(Object.fromEntries(Object.keys(reads).map(key => [key, 1])));
  });

  it('returns only base fields when no mixin properties are present', () => {
    const out = serializeFlatSync(fake());
    expect(out).toEqual({
      id: '1:2',
      name: 'Node',
      type: 'RECTANGLE',
      visible: true,
      locked: false,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      parentId: '1:1',
    });
    expect(out.children).toBeUndefined();
  });

  it('enriches with rotation / opacity / cornerRadius / fills', () => {
    const out = serializeFlatSync(
      fake({
        rotation: 45,
        opacity: 0.5,
        cornerRadius: 8,
        fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 1, g: 0, b: 0 } }],
      }),
    );
    expect(out.rotation).toBe(45);
    expect(out.opacity).toBe(0.5);
    expect(out.cornerRadius).toBe(8);
    expect(out.fills).toEqual([
      { type: 'SOLID', visible: true, opacity: 1, color: { r: 1, g: 0, b: 0 } },
    ]);
  });

  it('marks cornerRadius=mixed when value is not a number (figma.mixed symbol)', () => {
    const out = serializeFlatSync(fake({ cornerRadius: Symbol('figma.mixed') }));
    expect(out.cornerRadius).toBe(MIXED);
  });

  it('surfaces per-corner cornerRadii when cornerRadius is mixed (e.g. top-only rounded card)', () => {
    const out = serializeFlatSync(
      fake({
        cornerRadius: Symbol('figma.mixed'),
        topLeftRadius: 8,
        topRightRadius: 8,
        bottomRightRadius: 0,
        bottomLeftRadius: 0,
      }),
    );
    expect(out.cornerRadius).toBe(MIXED);
    expect(out.cornerRadii).toEqual({ topLeft: 8, topRight: 8, bottomRight: 0, bottomLeft: 0 });
  });

  it('omits cornerRadii when per-corner radii are unavailable (not all numeric)', () => {
    const out = serializeFlatSync(fake({ cornerRadius: Symbol('figma.mixed') }));
    expect(out.cornerRadii).toBeUndefined();
  });

  it('surfaces blendMode but omits the no-op PASS_THROUGH', () => {
    expect(serializeFlatSync(fake({ blendMode: 'MULTIPLY' })).blendMode).toBe('MULTIPLY');
    expect(serializeFlatSync(fake({ blendMode: 'PASS_THROUGH' })).blendMode).toBeUndefined();
  });

  it('surfaces isMask / maskType only for mask nodes', () => {
    const out = serializeFlatSync(fake({ isMask: true, maskType: 'ALPHA' }));
    expect(out.isMask).toBe(true);
    expect(out.maskType).toBe('ALPHA');
    expect(serializeFlatSync(fake({ isMask: false })).isMask).toBeUndefined();
  });

  it('surfaces ellipse arcData for a partial sweep (pie) or non-zero innerRadius (donut)', () => {
    const pie = serializeFlatSync(
      fake({ arcData: { startingAngle: 0, endingAngle: Math.PI, innerRadius: 0 } }),
    );
    expect(pie.arcData).toEqual({ startingAngle: 0, endingAngle: Math.PI, innerRadius: 0 });
    const donut = serializeFlatSync(
      fake({ arcData: { startingAngle: 0, endingAngle: Math.PI * 2, innerRadius: 0.6 } }),
    );
    expect(donut.arcData).toEqual({ startingAngle: 0, endingAngle: Math.PI * 2, innerRadius: 0.6 });
  });

  it('omits arcData for a plain full disc and for non-ellipse nodes', () => {
    const disc = serializeFlatSync(
      fake({ arcData: { startingAngle: 0, endingAngle: Math.PI * 2, innerRadius: 0 } }),
    );
    expect(disc.arcData).toBeUndefined();
    expect(serializeFlatSync(fake()).arcData).toBeUndefined();
  });
});
