import { createBatchHandler } from '../../../src/features/batch/batch.handler.js';
import { createSetAutoLayoutHandler } from '../../../src/features/layout/set-auto-layout.handler.js';
import { createSetFillsHandler } from '../../../src/features/paint/set-fills.handler.js';
import { type TreeNode, makeTree } from './batch-tree-fake.js';

export const makeGrid = (init: {
  positioning: 'MANUAL' | 'ROW_AUTO_FLOW';
  autoTracks: 'NONE' | 'ROWS';
  cells?: [number, number][];
}) => {
  const { node, figmaCtx } = makeTree();
  const page = node('P0', 'PAGE', null);
  node('F', 'RECTANGLE', page, { fills: [] });
  const grid = node('G', 'FRAME', page);
  const st = { positioning: init.positioning, autoTracks: init.autoTracks, rows: 2, columns: 3 };
  const cell = new Map<TreeNode, [number, number]>();
  const memory = new Map<TreeNode, [number, number]>();
  const kids = ['c0', 'c1', 'c2', 'c3', 'c4'].map(id => node(id, 'RECTANGLE', grid));
  const needed = (): number => Math.max(1, ...[...cell.values()].map(([r]) => r + 1));
  const flow = (): void => {
    grid.children!.forEach((c, i) => cell.set(c, [Math.floor(i / st.columns), i % st.columns]));
    st.rows = st.autoTracks === 'ROWS' ? needed() : Math.max(st.rows, needed());
  };
  const occupied = (r: number, c: number, except: TreeNode): boolean =>
    [...cell].some(([k, [kr, kc]]) => k !== except && kr === r && kc === c);
  kids.forEach((k, i) => {
    const at = init.cells?.[i] ?? [Math.floor(i / 3), i % 3];
    cell.set(k, at);
    if (init.positioning === 'MANUAL') memory.set(k, at);
    Object.defineProperty(k, 'gridRowAnchorIndex', { get: () => cell.get(k)![0] });
    Object.defineProperty(k, 'gridColumnAnchorIndex', { get: () => cell.get(k)![1] });
    k.setGridChildPosition = (r: number, c: number) => {
      if (st.positioning === 'ROW_AUTO_FLOW') throw new Error('cannot set grid child position');
      if (r >= st.rows || c >= st.columns) throw new Error('out of bounds of the grid');
      if (occupied(r, c, k)) throw new Error('cell is occupied');
      cell.set(k, [r, c]);
      memory.set(k, [r, c]);
    };
  });
  const tracks = (n: number) => Array.from({ length: n }, () => ({ type: 'FLEX', value: 1 }));
  const props: Record<string, { get: () => unknown; set: (v: never) => void }> = {
    layoutMode: {
      get: () => 'GRID',
      set: (v: string) => {
        if (v !== 'GRID') throw new Error('this stand-in stays a GRID');
        st.columns = 2;
        flow();
      },
    },
    gridItemsPositioning: {
      get: () => st.positioning,
      set: (v: 'MANUAL' | 'ROW_AUTO_FLOW') => {
        st.positioning = v;
        if (v === 'ROW_AUTO_FLOW') return flow();
        for (const k of kids) cell.set(k, memory.get(k) ?? [-1, -1]);
        if (st.autoTracks === 'ROWS') st.rows = needed();
      },
    },
    gridAutoTracks: {
      get: () => st.autoTracks,
      set: (v: 'NONE' | 'ROWS') => {
        st.autoTracks = v;
        if (v === 'ROWS') st.rows = needed();
      },
    },
    gridRowCount: {
      get: () => st.rows,
      set: (v: number) => {
        if (st.autoTracks === 'ROWS') throw new Error('cannot set grid row count manually');
        if (v < needed()) throw new Error('Cannot delete occupied row/column');
        st.rows = v;
      },
    },
    gridColumnCount: {
      get: () => st.columns,
      set: (v: number) => {
        const cut = [...cell].filter(([, [, c]]) => c >= v).map(([k]) => k);
        if (st.positioning === 'MANUAL') {
          if (cut.length > 0 && st.autoTracks !== 'ROWS')
            throw new Error('Cannot delete occupied row/column');
          st.columns = v;
          if (cut.length > 0) {
            flow();
            for (const k of kids) memory.set(k, cell.get(k)!);
          }
          return;
        }
        for (const k of kids) if ((memory.get(k)?.[1] ?? -1) >= v) memory.delete(k);
        st.columns = v;
        flow();
      },
    },
    gridRowSizes: { get: () => tracks(st.rows), set: () => undefined },
    gridColumnSizes: { get: () => tracks(st.columns), set: () => undefined },
  };
  for (const [k, d] of Object.entries(props))
    Object.defineProperty(grid, k, { ...d, enumerable: true });
  Object.assign(grid, { paddingTop: 0, gridRowGap: 0, gridColumnGap: 0 });
  const handler = createBatchHandler(figmaCtx, {
    set_auto_layout: createSetAutoLayoutHandler(figmaCtx),
    set_fills: createSetFillsHandler(figmaCtx),
  });
  const state = () => ({
    positioning: st.positioning,
    autoTracks: st.autoTracks,
    rows: st.rows,
    columns: st.columns,
    cells: kids.map(k => cell.get(k)),
  });
  return { handler, state };
};
