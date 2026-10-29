import { describe, expect, it } from 'vitest';

import { serializeLayoutGrid } from '../../src/serialize/layout-grid.js';

describe('serializeLayoutGrid', () => {
  it('serializes a COLUMNS grid with count / gutterSize / alignment / sectionSize', () => {
    const out = serializeLayoutGrid({
      pattern: 'COLUMNS',
      visible: true,
      count: 12,
      gutterSize: 20,
      alignment: 'STRETCH',
      sectionSize: 80,
    } as unknown as LayoutGrid);
    expect(out).toEqual({
      pattern: 'COLUMNS',
      visible: true,
      count: 12,
      gutterSize: 20,
      alignment: 'STRETCH',
      sectionSize: 80,
    });
  });

  it('omits sectionSize when absent on a row/column grid', () => {
    const out = serializeLayoutGrid({
      pattern: 'ROWS',
      visible: true,
      count: 5,
      gutterSize: 10,
      alignment: 'MIN',
    } as unknown as LayoutGrid);
    expect(out.sectionSize).toBeUndefined();
  });

  it('serializes a GRID pattern with sectionSize only', () => {
    const out = serializeLayoutGrid({
      pattern: 'GRID',
      visible: true,
      sectionSize: 8,
    } as unknown as LayoutGrid);
    expect(out).toEqual({ pattern: 'GRID', visible: true, sectionSize: 8 });
  });

  it('surfaces a non-zero offset (the page margin) on a row/column grid', () => {
    const out = serializeLayoutGrid({
      pattern: 'COLUMNS',
      visible: true,
      count: 12,
      gutterSize: 24,
      alignment: 'STRETCH',
      offset: 32,
    } as unknown as LayoutGrid);
    expect(out.offset).toBe(32);
  });

  it('omits offset when it is 0 or when alignment is CENTER (which ignores it)', () => {
    const zero = serializeLayoutGrid({
      pattern: 'COLUMNS',
      visible: true,
      count: 12,
      gutterSize: 24,
      alignment: 'STRETCH',
      offset: 0,
    } as unknown as LayoutGrid);
    expect(zero.offset).toBeUndefined();

    const centered = serializeLayoutGrid({
      pattern: 'COLUMNS',
      visible: true,
      count: 12,
      gutterSize: 24,
      alignment: 'CENTER',
      offset: 32,
    } as unknown as LayoutGrid);
    expect(centered.offset).toBeUndefined();
  });
});
