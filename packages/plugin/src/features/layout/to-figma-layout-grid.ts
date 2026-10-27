import type { GridInput } from '@figma-forge/core';

const DEFAULT_GRID_CELL = 10;

const toFlowGrid = (grid: GridInput, pattern: 'ROWS' | 'COLUMNS'): RowsColsLayoutGrid => {
  const alignment = grid.alignment ?? 'STRETCH';
  return {
    pattern,
    visible: grid.visible,
    alignment,
    gutterSize: grid.gutterSize ?? 0,
    count: grid.count ?? 1,
    ...(alignment === 'CENTER' ? {} : { offset: grid.offset ?? 0 }),
    ...(grid.sectionSize === undefined ? {} : { sectionSize: grid.sectionSize }),
  };
};

export const toFigmaLayoutGrid = (grid: GridInput): LayoutGrid =>
  grid.pattern === 'GRID'
    ? { pattern: 'GRID', visible: grid.visible, sectionSize: grid.sectionSize ?? DEFAULT_GRID_CELL }
    : toFlowGrid(grid, grid.pattern);
