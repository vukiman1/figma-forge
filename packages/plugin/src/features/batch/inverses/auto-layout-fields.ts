export const AUTO_LAYOUT_PROPS = [
  'layoutWrap',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'itemSpacing',
  'counterAxisSpacing',
  'primaryAxisAlignItems',
  'counterAxisAlignItems',
  'counterAxisAlignContent',
  'itemReverseZIndex',
  'strokesIncludedInLayout',
] as const;

export const GRID_PROPS = [
  'gridRowCount',
  'gridColumnCount',
  'gridRowSizes',
  'gridColumnSizes',
  'gridRowGap',
  'gridColumnGap',
] as const;

export const GRID_COLUMN_PROPS = [
  'gridColumnCount',
  'gridColumnSizes',
  'gridRowGap',
  'gridColumnGap',
] as const;

export const GRID_ROW_PROPS = ['gridRowCount', 'gridRowSizes'] as const;

export const GRID_MODES = ['gridItemsPositioning', 'gridAutoTracks'] as const;

export const AUTO_LAYOUT_BINDINGS = [
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'itemSpacing',
  'counterAxisSpacing',
  'gridRowGap',
  'gridColumnGap',
] as const;

export const NO_LAYOUT = 'NONE';
export const GRID_LAYOUT = 'GRID';
export const AUTO_ROWS = 'ROWS';
export const NO_AUTO_TRACKS = 'NONE';
export const ROW_AUTO_FLOW = 'ROW_AUTO_FLOW';
export const MANUAL_POSITIONING = 'MANUAL';
