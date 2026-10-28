import type { SerializedGridChild } from '@figma-forge/core';

const DEFAULT_SPAN = 1;
const DEFAULT_ALIGN = 'AUTO';

const numberField = (node: SceneNode, key: string): number | undefined => {
  const value: unknown = Reflect.get(node, key);
  return typeof value === 'number' ? value : undefined;
};

const stringField = (node: SceneNode, key: string): string | undefined => {
  const value: unknown = Reflect.get(node, key);
  return typeof value === 'string' ? value : undefined;
};

const addAnchors = (node: SceneNode, out: SerializedGridChild): void => {
  const rowAnchor = numberField(node, 'gridRowAnchorIndex');
  if (rowAnchor !== undefined && rowAnchor >= 0) out.rowAnchorIndex = rowAnchor;
  const columnAnchor = numberField(node, 'gridColumnAnchorIndex');
  if (columnAnchor !== undefined && columnAnchor >= 0) out.columnAnchorIndex = columnAnchor;
};

const addSpans = (node: SceneNode, out: SerializedGridChild): void => {
  const rowSpan = numberField(node, 'gridRowSpan');
  if (rowSpan !== undefined && rowSpan !== DEFAULT_SPAN) out.rowSpan = rowSpan;
  const columnSpan = numberField(node, 'gridColumnSpan');
  if (columnSpan !== undefined && columnSpan !== DEFAULT_SPAN) out.columnSpan = columnSpan;
};

const addAlignment = (node: SceneNode, out: SerializedGridChild): void => {
  const horizontal = stringField(node, 'gridChildHorizontalAlign');
  if (horizontal !== undefined && horizontal !== DEFAULT_ALIGN) out.horizontalAlign = horizontal;
  const vertical = stringField(node, 'gridChildVerticalAlign');
  if (vertical !== undefined && vertical !== DEFAULT_ALIGN) out.verticalAlign = vertical;
};

export const serializeGridChild = (
  node: SceneNode,
  flowed: boolean,
): SerializedGridChild | undefined => {
  const out: SerializedGridChild = {};
  if (!flowed) addAnchors(node, out);
  addSpans(node, out);
  addAlignment(node, out);
  return Object.keys(out).length > 0 ? out : undefined;
};
