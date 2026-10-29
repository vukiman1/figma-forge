import { pickDefined } from '@figma-forge/core';

import type { AutoLayoutNode, AutoLayoutParams } from './auto-layout-guards.js';

const PADDING_FIELDS = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const;

const GRID_SIZE_FIELDS = [
  'gridRowCount',
  'gridColumnCount',
  'gridRowGap',
  'gridColumnGap',
] as const;

const FLEX_FIELDS = [
  'itemSpacing',
  'primaryAxisAlignItems',
  'counterAxisAlignItems',
  'layoutWrap',
  'counterAxisSpacing',
  'counterAxisAlignContent',
  'itemReverseZIndex',
  'strokesIncludedInLayout',
] as const;

const applyGrid = (node: AutoLayoutNode, params: AutoLayoutParams): void => {
  if (params.gridAutoTracks === 'NONE') Reflect.set(node, 'gridAutoTracks', 'NONE');
  if (params.gridItemsPositioning === 'ROW_AUTO_FLOW') {
    Reflect.set(node, 'gridItemsPositioning', 'ROW_AUTO_FLOW');
  }
  Object.assign(node, pickDefined(params, GRID_SIZE_FIELDS));
  if (params.gridAutoTracks === 'ROWS') Reflect.set(node, 'gridAutoTracks', 'ROWS');
};

export const applyAutoLayout = (node: AutoLayoutNode, params: AutoLayoutParams): void => {
  if (node.layoutMode !== params.layoutMode) node.layoutMode = params.layoutMode;
  if (params.layoutMode === 'NONE') return;
  Object.assign(node, pickDefined(params, PADDING_FIELDS));
  if (params.layoutMode === 'GRID') applyGrid(node, params);
  else Object.assign(node, pickDefined(params, FLEX_FIELDS));
};
