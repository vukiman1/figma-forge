import type { SerializedNode } from '@figma-forge/core';

import { fieldOf, numberFieldOf, stringFieldOf } from '../field-of.js';
import { serializeLayoutGrid } from '../layout-grid.js';
import { isLayoutGridList } from './figma-lists.js';

const NO_OVERFLOW = 'NONE';

const writeSizeBounds = (node: SceneNode, out: SerializedNode): void => {
  if (!('minWidth' in node)) return;
  const minWidth = numberFieldOf(node, 'minWidth');
  const maxWidth = numberFieldOf(node, 'maxWidth');
  const minHeight = numberFieldOf(node, 'minHeight');
  const maxHeight = numberFieldOf(node, 'maxHeight');
  if (minWidth !== undefined) out.minWidth = minWidth;
  if (maxWidth !== undefined) out.maxWidth = maxWidth;
  if (minHeight !== undefined) out.minHeight = minHeight;
  if (maxHeight !== undefined) out.maxHeight = maxHeight;
};

const writeLayoutGrids = (node: SceneNode, out: SerializedNode): void => {
  const grids = fieldOf(node, 'layoutGrids');
  if (isLayoutGridList(grids) && grids.length > 0) {
    out.layoutGrids = grids.map(grid => serializeLayoutGrid(grid));
  }
};

const writeAspectRatio = (node: SceneNode, out: SerializedNode): void => {
  const ratio = fieldOf(node, 'targetAspectRatio');
  const x = numberFieldOf(ratio, 'x');
  const y = numberFieldOf(ratio, 'y');
  if (x !== undefined && y !== undefined && x > 0 && y > 0) out.targetAspectRatio = { x, y };
};

export const writeFrameFields = (node: SceneNode, out: SerializedNode): void => {
  writeSizeBounds(node, out);
  const clipsContent = fieldOf(node, 'clipsContent');
  if (typeof clipsContent === 'boolean') out.clipsContent = clipsContent;
  writeLayoutGrids(node, out);
  const overflow = stringFieldOf(node, 'overflowDirection');
  if (overflow !== undefined && overflow !== NO_OVERFLOW) out.overflowDirection = overflow;
  const fixed = numberFieldOf(node, 'numberOfFixedChildren');
  if (fixed !== undefined && fixed > 0) out.numberOfFixedChildren = fixed;
  writeAspectRatio(node, out);
};
