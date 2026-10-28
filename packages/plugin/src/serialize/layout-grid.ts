import type { SerializedBindings, SerializedLayoutGrid } from '@figma-forge/core';

import { collectBindings } from './bindings.js';

const serializeRowsColumnsGrid = (
  grid: RowsColsLayoutGrid,
  bound: SerializedBindings | undefined,
): SerializedLayoutGrid => {
  const out: SerializedLayoutGrid = {
    pattern: grid.pattern,
    visible: grid.visible ?? true,
    count: grid.count,
    gutterSize: grid.gutterSize,
    alignment: grid.alignment,
  };
  if (typeof grid.sectionSize === 'number') out.sectionSize = grid.sectionSize;
  if (typeof grid.offset === 'number' && grid.offset !== 0 && grid.alignment !== 'CENTER') {
    out.offset = grid.offset;
  }
  if (bound !== undefined) out.boundVariables = bound;
  return out;
};

export const serializeLayoutGrid = (grid: LayoutGrid): SerializedLayoutGrid => {
  const bound = collectBindings(grid.boundVariables);
  if (grid.pattern !== 'GRID') return serializeRowsColumnsGrid(grid, bound);
  return {
    pattern: 'GRID',
    visible: grid.visible ?? true,
    sectionSize: grid.sectionSize,
    ...(bound === undefined ? {} : { boundVariables: bound }),
  };
};
