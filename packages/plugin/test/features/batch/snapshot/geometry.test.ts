import { describe, expect, it } from 'vitest';

import {
  captureGeometry,
  restoreGeometry,
} from '../../../../src/features/batch/snapshot/geometry.js';

describe('restoreGeometry', () => {
  const gridChild = (parent: Record<string, unknown>) => {
    const placed: [number, number][] = [];
    const child = {
      id: 'c',
      type: 'RECTANGLE',
      parent,
      width: 40,
      height: 40,
      relativeTransform: [
        [1, 0, 0],
        [0, 1, 0],
      ],
      gridRowAnchorIndex: 0,
      gridColumnAnchorIndex: 1,
      setGridChildPosition(row: number, column: number) {
        if (parent.gridItemsPositioning === 'ROW_AUTO_FLOW')
          throw new Error('cannot place directly');
        placed.push([row, column]);
      },
    };
    return { child: child as unknown as SceneNode & typeof child, placed };
  };

  it("leaves a flowing grid child's cell to its layer order, captured and restored alike", () => {
    const flowing = { layoutMode: 'GRID', gridItemsPositioning: 'ROW_AUTO_FLOW' };
    const { child, placed } = gridChild(flowing);
    const snapshot = captureGeometry(child);
    expect(snapshot.grid).toBeNull();
    child.gridColumnAnchorIndex = 2;
    expect(() => restoreGeometry(child, snapshot)).not.toThrow();

    const parent: Record<string, unknown> = { layoutMode: 'GRID', gridItemsPositioning: 'MANUAL' };
    const pinned = gridChild(parent);
    const manual = captureGeometry(pinned.child);
    expect(manual.grid).toEqual({ row: 0, column: 1 });
    parent.gridItemsPositioning = 'ROW_AUTO_FLOW';
    pinned.child.gridColumnAnchorIndex = 2;
    expect(() => restoreGeometry(pinned.child, manual)).not.toThrow();
    parent.gridItemsPositioning = 'MANUAL';
    restoreGeometry(pinned.child, manual);
    expect(pinned.placed).toEqual([[0, 1]]);
    expect(placed).toEqual([]);
  });

  it('writes bounds, positioning, the sizing primitives, then the size and transform — a size written while FILL is overridden by the layout', () => {
    const log: string[] = [];
    const state: Record<string, unknown> = {
      maxWidth: null,
      layoutPositioning: 'ABSOLUTE',
      layoutGrow: 0,
      layoutAlign: 'INHERIT',
      constraints: { horizontal: 'MIN', vertical: 'MIN' },
    };
    const node = new Proxy(
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion -- tsc needs the index signature the Proxy handler writes through
      {
        id: '1:1',
        type: 'RECTANGLE',
        parent: { layoutMode: 'HORIZONTAL' },
        width: 100,
        height: 50,
        relativeTransform: [
          [1, 0, 10],
          [0, 1, 20],
        ],
        resizeWithoutConstraints(w: number, h: number) {
          log.push('size');
          (node as unknown as Record<string, unknown>).width = w;
          (node as unknown as Record<string, unknown>).height = h;
        },
      } as Record<string, unknown>,
      {
        has: (t, k) => k in t || k in state,
        get: (t, k: string) => (k in state ? state[k] : t[k]),
        set: (t, k: string, v) => {
          if (k === 'relativeTransform') log.push('transform');
          if (k in state) {
            log.push(k);
            state[k] = v;
          } else t[k] = v;
          return true;
        },
      },
    ) as unknown as SceneNode & Record<string, unknown>;
    const snapshot = captureGeometry(node);

    state.maxWidth = 60;
    state.layoutPositioning = 'AUTO';
    state.layoutGrow = 1;
    (node as unknown as Record<string, unknown>).width = 60;
    node.relativeTransform = [
      [1, 0, 0],
      [0, 1, 0],
    ];
    log.length = 0;

    restoreGeometry(node, snapshot);

    expect(log).toEqual(['maxWidth', 'layoutPositioning', 'layoutGrow', 'size', 'transform']);
    expect(node.relativeTransform).toEqual(snapshot.transform);
  });
});
