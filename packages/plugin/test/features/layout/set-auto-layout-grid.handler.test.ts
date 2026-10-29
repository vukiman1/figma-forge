import { describe, expect, it } from 'vitest';

import { createSetAutoLayoutHandler } from '../../../src/features/layout/set-auto-layout.handler.js';

const fakeFigma = (lookup: Record<string, unknown>): typeof figma =>
  ({ getNodeByIdAsync: async (id: string) => lookup[id] ?? null }) as unknown as typeof figma;

const makeFrame = () => ({
  id: '1:1',
  layoutMode: 'NONE',
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  itemSpacing: 0,
  primaryAxisAlignItems: 'MIN',
  counterAxisAlignItems: 'MIN',
  layoutWrap: 'NO_WRAP',
  counterAxisSpacing: null as number | null,
  counterAxisAlignContent: 'AUTO',
  itemReverseZIndex: false,
  strokesIncludedInLayout: false,
  gridRowCount: 0,
  gridColumnCount: 0,
  gridRowGap: 0,
  gridColumnGap: 0,
});

const makeGrid = (init: {
  positioning: 'MANUAL' | 'ROW_AUTO_FLOW';
  autoTracks: 'NONE' | 'ROWS';
  remembered?: ([number, number] | undefined)[];
}) => {
  const log: string[] = [];
  const children = (init.remembered ?? [undefined, undefined, undefined]).map((_, i) => ({
    id: `c${i}`,
    gridRowAnchorIndex: 0,
    gridColumnAnchorIndex: i,
  }));
  let layoutMode = 'GRID';
  let positioning: string = init.positioning;
  let autoTracks: string = init.autoTracks;
  let rows = 1;
  let columns = 3;
  const node = {
    ...makeFrame(),
    children,
    log,
    get layoutMode() {
      return layoutMode;
    },
    set layoutMode(v: string) {
      log.push(`layoutMode=${v}`);
      if (v === 'GRID') columns = 2;
      layoutMode = v;
    },
    get gridRowCount() {
      return rows;
    },
    set gridRowCount(v: number) {
      if (autoTracks === 'ROWS') throw new Error('cannot set grid row count manually');
      log.push(`gridRowCount=${v}`);
      rows = v;
    },
    get gridColumnCount() {
      return columns;
    },
    set gridColumnCount(v: number) {
      log.push(`gridColumnCount=${v}`);
      columns = v;
    },
    get gridAutoTracks() {
      return autoTracks;
    },
    set gridAutoTracks(v: string) {
      log.push(`gridAutoTracks=${v}`);
      autoTracks = v;
    },
    get gridItemsPositioning() {
      return positioning;
    },
    set gridItemsPositioning(v: string) {
      log.push(`gridItemsPositioning=${v}`);
      positioning = v;
      children.forEach((c, i) => {
        const cell = v === 'MANUAL' ? init.remembered?.[i] : [0, i];
        c.gridRowAnchorIndex = cell?.[0] ?? -1;
        c.gridColumnAnchorIndex = cell?.[1] ?? -1;
      });
    },
  };
  return node;
};

describe('set_auto_layout — GRID placement modes', () => {
  it('leaves the mode of a frame that is already a GRID alone, so its tracks survive', async () => {
    const node = makeGrid({ positioning: 'MANUAL', autoTracks: 'NONE' });
    await createSetAutoLayoutHandler(fakeFigma({ '1:1': node }))({
      nodeId: '1:1',
      layoutMode: 'GRID',
      gridRowGap: 16,
    });
    expect(node.log).not.toContain('layoutMode=GRID');
    expect(node.gridColumnCount).toBe(3);
    expect(node.gridRowGap).toBe(16);
  });

  it('refuses gridRowCount under ROWS before writing anything', async () => {
    const node = makeGrid({ positioning: 'MANUAL', autoTracks: 'ROWS' });
    const handler = createSetAutoLayoutHandler(fakeFigma({ '1:1': node }));
    await expect(
      handler({ nodeId: '1:1', layoutMode: 'GRID', paddingTop: 9, gridRowCount: 4 }),
    ).rejects.toThrow(/managed by Figma while gridAutoTracks is ROWS/);
    await expect(
      createSetAutoLayoutHandler(fakeFigma({ '1:1': makeFrame() }))({
        nodeId: '1:1',
        layoutMode: 'GRID',
        gridAutoTracks: 'ROWS',
        gridRowCount: 4,
      }),
    ).rejects.toThrow(/gridAutoTracks is ROWS/);
    expect(node.paddingTop).toBe(0);
    expect(node.log).toEqual([]);
  });

  it('writes NONE and ROW_AUTO_FLOW before the counts, ROWS after them', async () => {
    const rows = makeGrid({ positioning: 'MANUAL', autoTracks: 'ROWS' });
    await createSetAutoLayoutHandler(fakeFigma({ '1:1': rows }))({
      nodeId: '1:1',
      layoutMode: 'GRID',
      gridAutoTracks: 'NONE',
      gridRowCount: 4,
    });
    expect(rows.log).toEqual(['gridAutoTracks=NONE', 'gridRowCount=4']);

    const manual = makeGrid({ positioning: 'MANUAL', autoTracks: 'NONE' });
    await createSetAutoLayoutHandler(fakeFigma({ '1:1': manual }))({
      nodeId: '1:1',
      layoutMode: 'GRID',
      gridItemsPositioning: 'ROW_AUTO_FLOW',
      gridAutoTracks: 'ROWS',
      gridColumnCount: 2,
    });
    expect(manual.log).toEqual([
      'gridItemsPositioning=ROW_AUTO_FLOW',
      'gridColumnCount=2',
      'gridAutoTracks=ROWS',
    ]);
  });

  it('switches a flowing grid to MANUAL when Figma gives every child its cell back', async () => {
    const node = makeGrid({
      positioning: 'ROW_AUTO_FLOW',
      autoTracks: 'NONE',
      remembered: [
        [0, 1],
        [0, 0],
        [0, 2],
      ],
    });
    await createSetAutoLayoutHandler(fakeFigma({ '1:1': node }))({
      nodeId: '1:1',
      layoutMode: 'GRID',
      gridItemsPositioning: 'MANUAL',
    });
    expect(node.gridItemsPositioning).toBe('MANUAL');
    expect(node.children.map(c => c.gridColumnAnchorIndex)).toEqual([1, 0, 2]);
  });

  it('leaves the placement mode alone when the call is not for a GRID', async () => {
    const node = makeGrid({ positioning: 'ROW_AUTO_FLOW', autoTracks: 'NONE' });
    await createSetAutoLayoutHandler(fakeFigma({ '1:1': node }))({
      nodeId: '1:1',
      layoutMode: 'VERTICAL',
      gridItemsPositioning: 'MANUAL',
    });
    expect(node.log).toEqual(['layoutMode=VERTICAL']);
  });

  it('refuses MANUAL and goes back to ROW_AUTO_FLOW when a child would be left without a cell', async () => {
    const node = makeGrid({
      positioning: 'ROW_AUTO_FLOW',
      autoTracks: 'NONE',
      remembered: [[0, 0], undefined, [0, 1]],
    });
    await expect(
      createSetAutoLayoutHandler(fakeFigma({ '1:1': node }))({
        nodeId: '1:1',
        layoutMode: 'GRID',
        gridItemsPositioning: 'MANUAL',
        paddingTop: 9,
        gridColumnCount: 4,
      }),
    ).rejects.toThrow(/leave 1 of its 3 children without a cell/);
    expect(node.gridItemsPositioning).toBe('ROW_AUTO_FLOW');
    expect(node.children.map(c => c.gridColumnAnchorIndex)).toEqual([0, 1, 2]);
    expect(node.log).toEqual(['gridItemsPositioning=MANUAL', 'gridItemsPositioning=ROW_AUTO_FLOW']);
    expect(node.paddingTop).toBe(0);
  });
});
