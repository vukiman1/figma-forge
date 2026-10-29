import { isInFlow, pickFields, readField, same, writeIfDifferent } from './values.js';

const DERIVED_BOX_TYPES: ReadonlySet<string> = new Set([
  'GROUP',
  'BOOLEAN_OPERATION',
  'TRANSFORM_GROUP',
]);
const MIN_MAX = ['minWidth', 'maxWidth', 'minHeight', 'maxHeight'] as const;
const SIZING = [
  'layoutGrow',
  'layoutAlign',
  'primaryAxisSizingMode',
  'counterAxisSizingMode',
  'textAutoResize',
] as const;
const GRID_CHILD = [
  'gridRowSpan',
  'gridColumnSpan',
  'gridChildHorizontalAlign',
  'gridChildVerticalAlign',
] as const;
const LAYOUT_FIELDS = [...MIN_MAX, 'layoutPositioning', ...SIZING, 'constraints', ...GRID_CHILD];
const ROW_AUTO_FLOW = 'ROW_AUTO_FLOW';

interface GridCell {
  readonly row: number;
  readonly column: number;
}

export interface GeometrySnapshot {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly transform: Transform;
  readonly layout: Record<string, unknown>;
  readonly grid: GridCell | null;
}

export const isDerivedBox = (node: BaseNode): boolean => DERIVED_BOX_TYPES.has(node.type);

const flowsIntoCells = (node: SceneNode): boolean =>
  readField(readField(node, 'parent'), 'gridItemsPositioning') === ROW_AUTO_FLOW;

const gridCellOf = (node: SceneNode): GridCell | null => {
  const isGridChild = readField(readField(node, 'parent'), 'layoutMode') === 'GRID';
  if (!isGridChild || flowsIntoCells(node)) return null;
  const row = readField(node, 'gridRowAnchorIndex');
  const column = readField(node, 'gridColumnAnchorIndex');
  return typeof row === 'number' && typeof column === 'number' ? { row, column } : null;
};

export const captureGeometry = (node: SceneNode): GeometrySnapshot => ({
  id: node.id,
  width: node.width,
  height: node.height,
  transform: node.relativeTransform,
  layout: pickFields(node, LAYOUT_FIELDS),
  grid: gridCellOf(node),
});

const writeLayout = (
  node: SceneNode,
  layout: Record<string, unknown>,
  keys: readonly string[],
): void => {
  for (const key of keys) if (key in layout) writeIfDifferent(node, key, layout[key]);
};

const restoreGridCell = (node: SceneNode, grid: GridCell | null): void => {
  if (grid === null || flowsIntoCells(node) || !('setGridChildPosition' in node)) return;
  const row = readField(node, 'gridRowAnchorIndex');
  const column = readField(node, 'gridColumnAnchorIndex');
  if (row !== grid.row || column !== grid.column) node.setGridChildPosition(grid.row, grid.column);
};

const restoreSize = (node: SceneNode, snapshot: GeometrySnapshot): void => {
  if (isDerivedBox(node) || (node.width === snapshot.width && node.height === snapshot.height)) {
    return;
  }
  if ('resizeWithoutConstraints' in node) {
    node.resizeWithoutConstraints(snapshot.width, snapshot.height);
  }
  writeLayout(node, snapshot.layout, SIZING);
};

const restoreTransform = (node: SceneNode, snapshot: GeometrySnapshot): void => {
  if (isInFlow(node) || isDerivedBox(node) || same(node.relativeTransform, snapshot.transform)) {
    return;
  }
  node.relativeTransform = snapshot.transform;
};

export const restoreGeometry = (node: SceneNode, snapshot: GeometrySnapshot): void => {
  writeLayout(node, snapshot.layout, [...MIN_MAX, 'layoutPositioning', ...SIZING]);
  restoreSize(node, snapshot);
  restoreTransform(node, snapshot);
  writeLayout(node, snapshot.layout, ['constraints']);
  restoreGridCell(node, snapshot.grid);
  writeLayout(node, snapshot.layout, GRID_CHILD);
};
