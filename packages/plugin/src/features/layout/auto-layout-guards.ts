import { SET_AUTO_LAYOUT_TOOL_NAME as TOOL, type setAutoLayoutParams } from '@figma-forge/core';
import type { z } from 'zod';

export type AutoLayoutParams = z.output<typeof setAutoLayoutParams>;

export type AutoLayoutNode = Extract<BaseNode, { layoutMode: unknown }>;

const isFlex = (mode: AutoLayoutParams['layoutMode']): boolean =>
  mode === 'HORIZONTAL' || mode === 'VERTICAL';

const anchorOf = (child: SceneNode, field: string): number => {
  const value: unknown = Reflect.get(child, field);
  return typeof value === 'number' ? value : 0;
};

const isWithoutCell = (child: SceneNode): boolean =>
  Reflect.get(child, 'layoutPositioning') !== 'ABSOLUTE' &&
  (anchorOf(child, 'gridRowAnchorIndex') < 0 || anchorOf(child, 'gridColumnAnchorIndex') < 0);

export const assertWrapForCrossAxis = (node: AutoLayoutNode, params: AutoLayoutParams): void => {
  const wantsCrossAxis =
    params.counterAxisSpacing !== undefined || params.counterAxisAlignContent !== undefined;
  if (!wantsCrossAxis || !isFlex(params.layoutMode)) return;
  if ((params.layoutWrap ?? node.layoutWrap) === 'WRAP') return;
  throw new Error(
    `${TOOL}: counterAxisSpacing / counterAxisAlignContent apply only to a wrapping flex — ` +
      'pass layoutWrap: "WRAP" (in this call or before)',
  );
};

export const assertRowCountSettable = (node: AutoLayoutNode, params: AutoLayoutParams): void => {
  if (params.layoutMode !== 'GRID' || params.gridRowCount === undefined) return;
  const current = node.layoutMode === 'GRID' ? Reflect.get(node, 'gridAutoTracks') : 'NONE';
  if ((params.gridAutoTracks ?? current) !== 'ROWS') return;
  throw new Error(
    `${TOOL}: gridRowCount is managed by Figma while gridAutoTracks is ROWS — omit it, or ` +
      'pass gridAutoTracks: "NONE" to set the row count yourself',
  );
};

export const switchToManualCells = (node: AutoLayoutNode, params: AutoLayoutParams): void => {
  const leavesAutoFlow =
    params.layoutMode === 'GRID' &&
    params.gridItemsPositioning === 'MANUAL' &&
    node.layoutMode === 'GRID' &&
    Reflect.get(node, 'gridItemsPositioning') === 'ROW_AUTO_FLOW';
  if (!leavesAutoFlow) return;
  Reflect.set(node, 'gridItemsPositioning', 'MANUAL');
  const lost = node.children.filter(isWithoutCell).length;
  if (lost === 0) return;
  Reflect.set(node, 'gridItemsPositioning', 'ROW_AUTO_FLOW');
  throw new Error(
    `${TOOL}: switching ${node.id} to MANUAL would leave ${lost} of its ` +
      `${node.children.length} children without a cell — Figma only puts a child back in a cell ` +
      'it held before the grid flowed, and only while that cell still exists. Nothing was ' +
      'changed; keep ROW_AUTO_FLOW',
  );
};
