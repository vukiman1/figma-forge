import { describe, expect, it } from 'vitest';

import { FAIL } from './batch-fake.js';
import { makeGrid } from './batch-grid-fake.js';

describe('batch inverse for GRID placement modes', () => {
  const layout = (params: Record<string, unknown>) => ({
    tool: 'set_auto_layout',
    params: { nodeId: 'G', layoutMode: 'GRID', ...params },
  });

  it('puts the columns of a MANUAL ROWS grid back without writing the row count Figma owns', async () => {
    const { handler, state } = makeGrid({ positioning: 'MANUAL', autoTracks: 'ROWS' });
    const before = state();
    await expect(handler({ ops: [layout({ gridColumnCount: 2 }), FAIL] })).rejects.toThrow(
      /rolled back 1 applied op\(s\)/,
    );
    expect(state()).toEqual(before);
  });

  it('restores MANUAL cells after a flowing column cut made Figma forget one of them', async () => {
    const cells: [number, number][] = [
      [0, 1],
      [0, 0],
      [0, 2],
      [1, 0],
      [1, 1],
    ];
    const { handler, state } = makeGrid({ positioning: 'MANUAL', autoTracks: 'NONE', cells });
    const before = state();
    await expect(
      handler({
        ops: [layout({ gridItemsPositioning: 'ROW_AUTO_FLOW', gridColumnCount: 2 }), FAIL],
      }),
    ).rejects.toThrow(/rolled back 1 applied op\(s\)/);
    expect(state()).toEqual(before);
  });

  it('turns ROWS back on after a row count written under NONE', async () => {
    const { handler, state } = makeGrid({ positioning: 'ROW_AUTO_FLOW', autoTracks: 'ROWS' });
    const before = state();
    await expect(
      handler({ ops: [layout({ gridAutoTracks: 'NONE', gridRowCount: 4 }), FAIL] }),
    ).rejects.toThrow(/rolled back 1 applied op\(s\)/);
    expect(state()).toEqual(before);
  });

  it('turns NONE back on and keeps its rows after ROWS dropped the empty ones', async () => {
    const { handler, state } = makeGrid({ positioning: 'ROW_AUTO_FLOW', autoTracks: 'NONE' });
    await handler({ ops: [layout({ gridRowCount: 4 })] });
    const before = state();
    await expect(handler({ ops: [layout({ gridAutoTracks: 'ROWS' }), FAIL] })).rejects.toThrow(
      /rolled back 1 applied op\(s\)/,
    );
    expect(state()).toEqual(before);
    expect(before.rows).toBe(4);
  });
});
