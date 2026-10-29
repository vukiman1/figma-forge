import type { SerializedAutoLayout } from '@figma-forge/core';

import { serializeGridTracks } from './grid-tracks.js';

type AutoLayoutMode = SerializedAutoLayout['mode'];

interface AutoLayoutSource {
  readonly paddingTop: number;
  readonly paddingRight: number;
  readonly paddingBottom: number;
  readonly paddingLeft: number;
  readonly itemSpacing: number;
  readonly primaryAxisAlignItems: string;
  readonly counterAxisAlignItems: string;
  readonly layoutWrap?: string;
  readonly counterAxisSpacing?: number | null;
  readonly counterAxisAlignContent?: string;
  readonly itemReverseZIndex?: boolean;
  readonly strokesIncludedInLayout?: boolean;
  readonly gridRowCount?: number;
  readonly gridColumnCount?: number;
  readonly gridRowGap?: number;
  readonly gridColumnGap?: number;
  readonly gridItemsPositioning?: string;
  readonly gridAutoTracks?: string;
  readonly gridRowSizes?: unknown;
  readonly gridColumnSizes?: unknown;
}

interface Padding {
  readonly paddingTop: number;
  readonly paddingRight: number;
  readonly paddingBottom: number;
  readonly paddingLeft: number;
}

const serializeGridLayout = (source: AutoLayoutSource, padding: Padding): SerializedAutoLayout => {
  const out: SerializedAutoLayout = { mode: 'GRID', ...padding };
  const { gridRowCount, gridColumnCount, gridRowGap, gridColumnGap } = source;
  if (typeof gridRowCount === 'number') out.gridRowCount = gridRowCount;
  if (typeof gridColumnCount === 'number') out.gridColumnCount = gridColumnCount;
  if (source.gridItemsPositioning === 'ROW_AUTO_FLOW') out.gridItemsPositioning = 'ROW_AUTO_FLOW';
  if (source.gridAutoTracks === 'ROWS') out.gridAutoTracks = 'ROWS';
  if (typeof gridRowGap === 'number') out.gridRowGap = gridRowGap;
  if (typeof gridColumnGap === 'number') out.gridColumnGap = gridColumnGap;
  const rowSizes = serializeGridTracks(source.gridRowSizes);
  if (rowSizes !== undefined) out.gridRowSizes = rowSizes;
  const columnSizes = serializeGridTracks(source.gridColumnSizes);
  if (columnSizes !== undefined) out.gridColumnSizes = columnSizes;
  return out;
};

const addWrapTracks = (source: AutoLayoutSource, out: SerializedAutoLayout): void => {
  const alignContent = source.counterAxisAlignContent;
  if (alignContent !== 'SPACE_BETWEEN') {
    const spacing = source.counterAxisSpacing;
    if (typeof spacing === 'number' && spacing !== 0) out.counterAxisSpacing = spacing;
  }
  if (typeof alignContent === 'string' && alignContent !== 'AUTO') {
    out.counterAxisAlignContent = alignContent;
  }
};

const serializeFlexLayout = (
  source: AutoLayoutSource,
  mode: AutoLayoutMode,
  padding: Padding,
): SerializedAutoLayout => {
  const out: SerializedAutoLayout = {
    mode,
    ...padding,
    itemSpacing: source.itemSpacing,
    primaryAxisAlignItems: source.primaryAxisAlignItems,
    counterAxisAlignItems: source.counterAxisAlignItems,
  };
  const wrap = source.layoutWrap;
  if (typeof wrap === 'string') out.layoutWrap = wrap;
  if (wrap === 'WRAP') addWrapTracks(source, out);
  if (source.itemReverseZIndex === true) out.itemReverseZIndex = true;
  if (source.strokesIncludedInLayout === true) out.strokesIncludedInLayout = true;
  return out;
};

export const serializeAutoLayout = (
  node: SceneNode,
  mode: AutoLayoutMode,
): SerializedAutoLayout => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- callers pass only nodes with a layoutMode, which carry the auto-layout fields
  const source = node as SceneNode & AutoLayoutSource;
  const padding: Padding = {
    paddingTop: source.paddingTop,
    paddingRight: source.paddingRight,
    paddingBottom: source.paddingBottom,
    paddingLeft: source.paddingLeft,
  };
  return mode === 'GRID'
    ? serializeGridLayout(source, padding)
    : serializeFlexLayout(source, mode, padding);
};
