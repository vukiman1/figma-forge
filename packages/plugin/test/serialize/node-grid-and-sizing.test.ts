import { describe, expect, it } from 'vitest';

import { serializeFlatSync } from '../../src/serialize/serialize-node.js';
import { fake } from './serialize-fake.js';

describe('serializeFlat — strokes / effects / auto layout', () => {
  it('serializes GRID layoutMode with counts / gaps / track sizes, no H/V-only fields', () => {
    const out = serializeFlatSync(
      fake({
        type: 'FRAME',
        layoutMode: 'GRID',
        paddingTop: 16,
        paddingRight: 16,
        paddingBottom: 16,
        paddingLeft: 16,
        gridRowCount: 2,
        gridColumnCount: 3,
        gridRowGap: 8,
        gridColumnGap: 12,
        gridRowSizes: [
          { type: 'FLEX', value: 1 },
          { type: 'FIXED', value: 100 },
        ],
        gridColumnSizes: [{ type: 'FLEX', value: 1 }],
      }),
    );
    expect(out.layout).toEqual({
      mode: 'GRID',
      paddingTop: 16,
      paddingRight: 16,
      paddingBottom: 16,
      paddingLeft: 16,
      gridRowCount: 2,
      gridColumnCount: 3,
      gridRowGap: 8,
      gridColumnGap: 12,
      gridRowSizes: [
        { type: 'FLEX', value: 1 },
        { type: 'FIXED', value: 100 },
      ],
      gridColumnSizes: [{ type: 'FLEX', value: 1 }],
    });
    expect(out.layout?.itemSpacing).toBeUndefined();
    expect(out.layout?.primaryAxisAlignItems).toBeUndefined();
  });

  it('reads the non-default GRID placement modes and leaves the defaults out', () => {
    const grid = (positioning: string, autoTracks: string) =>
      serializeFlatSync(
        fake({
          type: 'FRAME',
          layoutMode: 'GRID',
          gridColumnCount: 3,
          gridItemsPositioning: positioning,
          gridAutoTracks: autoTracks,
        }),
      ).layout;
    expect(grid('ROW_AUTO_FLOW', 'ROWS')).toMatchObject({
      gridItemsPositioning: 'ROW_AUTO_FLOW',
      gridAutoTracks: 'ROWS',
    });
    const defaults = grid('MANUAL', 'NONE');
    expect(defaults?.gridItemsPositioning).toBeUndefined();
    expect(defaults?.gridAutoTracks).toBeUndefined();
  });

  it('omits layout when layoutMode is NONE or absent', () => {
    expect(serializeFlatSync(fake({ type: 'FRAME', layoutMode: 'NONE' })).layout).toBeUndefined();
    expect(serializeFlatSync(fake({ type: 'RECTANGLE' })).layout).toBeUndefined();
  });
});

describe('serializeFlat — layout sizing / constraints / clipsContent', () => {
  it('captures auto-layout child sizing only when the parent is auto-layout', () => {
    const out = serializeFlatSync(
      fake({
        parent: { id: '1:1', layoutMode: 'HORIZONTAL' },
        layoutSizingHorizontal: 'FILL',
        layoutSizingVertical: 'HUG',
        layoutGrow: 1,
        layoutAlign: 'STRETCH',
        layoutPositioning: 'AUTO',
      }),
    );
    expect(out.layoutSizingHorizontal).toBe('FILL');
    expect(out.layoutSizingVertical).toBe('HUG');
    expect(out.layoutGrow).toBe(1);
    expect(out.layoutAlign).toBe('STRETCH');
    expect(out.layoutPositioning).toBeUndefined();
    expect(out.constraints).toBeUndefined();
  });

  it('captures min/max size bounds, omitting unset (null) ones', () => {
    const out = serializeFlatSync(
      fake({ minWidth: 120, maxWidth: null, minHeight: null, maxHeight: 480 }),
    );
    expect(out.minWidth).toBe(120);
    expect(out.maxWidth).toBeUndefined();
    expect(out.minHeight).toBeUndefined();
    expect(out.maxHeight).toBe(480);
  });

  it('omits min/max entirely for nodes without the properties', () => {
    const out = serializeFlatSync(fake({}));
    expect(out.minWidth).toBeUndefined();
    expect(out.maxHeight).toBeUndefined();
  });

  it('flags ABSOLUTE layoutPositioning', () => {
    const out = serializeFlatSync(
      fake({ parent: { id: '1:1', layoutMode: 'VERTICAL' }, layoutPositioning: 'ABSOLUTE' }),
    );
    expect(out.layoutPositioning).toBe('ABSOLUTE');
  });

  it('captures gridChild placement when the parent is a GRID (default span/align omitted)', () => {
    const out = serializeFlatSync(
      fake({
        parent: { id: '1:1', layoutMode: 'GRID' },
        gridRowAnchorIndex: 1,
        gridColumnAnchorIndex: 2,
        gridRowSpan: 2,
        gridColumnSpan: 1,
        gridChildHorizontalAlign: 'CENTER',
        gridChildVerticalAlign: 'AUTO',
      }),
    );
    expect(out.gridChild).toEqual({
      rowAnchorIndex: 1,
      columnAnchorIndex: 2,
      rowSpan: 2,
      horizontalAlign: 'CENTER',
    });
  });

  it('omits gridChild for a child with no cell (anchor -1, default span / align)', () => {
    const out = serializeFlatSync(
      fake({
        parent: { id: '1:1', layoutMode: 'GRID' },
        gridRowAnchorIndex: -1,
        gridColumnAnchorIndex: -1,
        gridRowSpan: 1,
        gridColumnSpan: 1,
        gridChildHorizontalAlign: 'AUTO',
        gridChildVerticalAlign: 'AUTO',
      }),
    );
    expect(out.gridChild).toBeUndefined();
  });

  it('drops the anchors Figma reports for a child of a ROW_AUTO_FLOW grid, keeping span and align', () => {
    const parent = { id: '1:1', layoutMode: 'GRID', gridItemsPositioning: 'ROW_AUTO_FLOW' };
    const child = (extra: Record<string, unknown>) =>
      serializeFlatSync(
        fake({
          parent,
          gridRowAnchorIndex: 1,
          gridColumnAnchorIndex: 2,
          gridRowSpan: 1,
          gridColumnSpan: 1,
          ...extra,
        }),
      ).gridChild;
    expect(child({})).toBeUndefined();
    expect(child({ gridColumnSpan: 2, gridChildVerticalAlign: 'CENTER' })).toEqual({
      columnSpan: 2,
      verticalAlign: 'CENTER',
    });
    expect(
      serializeFlatSync(
        fake({
          parent: { ...parent, gridItemsPositioning: 'MANUAL' },
          gridRowAnchorIndex: 1,
          gridColumnAnchorIndex: 2,
        }),
      ).gridChild,
    ).toEqual({ rowAnchorIndex: 1, columnAnchorIndex: 2 });
  });

  it('omits gridChild when the parent is not a GRID', () => {
    const out = serializeFlatSync(
      fake({
        parent: { id: '1:1', layoutMode: 'HORIZONTAL' },
        gridRowAnchorIndex: 0,
        gridColumnAnchorIndex: 0,
      }),
    );
    expect(out.gridChild).toBeUndefined();
  });

  it('falls back to constraints when parent is not auto-layout', () => {
    const out = serializeFlatSync(
      fake({ constraints: { horizontal: 'STRETCH', vertical: 'MIN' } }),
    );
    expect(out.constraints).toEqual({ horizontal: 'STRETCH', vertical: 'MIN' });
    expect(out.layoutSizingHorizontal).toBeUndefined();
  });

  it('serializes clipsContent', () => {
    expect(serializeFlatSync(fake({ clipsContent: true })).clipsContent).toBe(true);
  });

  it("surfaces a frame's own layoutGrids (the responsive column system)", () => {
    const out = serializeFlatSync(
      fake({
        type: 'FRAME',
        layoutGrids: [
          { pattern: 'COLUMNS', visible: true, count: 12, gutterSize: 24, alignment: 'STRETCH' },
        ],
      }),
    );
    expect(out.layoutGrids).toEqual([
      { pattern: 'COLUMNS', visible: true, count: 12, gutterSize: 24, alignment: 'STRETCH' },
    ]);
  });

  it('omits layoutGrids when the frame defines none', () => {
    expect(serializeFlatSync(fake({ type: 'FRAME', layoutGrids: [] })).layoutGrids).toBeUndefined();
  });

  it('surfaces overflowDirection on a scrolling frame, omits the NONE default', () => {
    expect(
      serializeFlatSync(fake({ type: 'FRAME', overflowDirection: 'VERTICAL' })).overflowDirection,
    ).toBe('VERTICAL');
    expect(
      serializeFlatSync(fake({ type: 'FRAME', overflowDirection: 'NONE' })).overflowDirection,
    ).toBeUndefined();
  });
});
