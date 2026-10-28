import type { SerializedNode } from '@figma-forge/core';

import { fieldOf, numberFieldOf, stringFieldOf } from '../field-of.js';
import { serializeGridChild } from '../grid-child.js';

const INHERITED_ALIGN = 'INHERIT';

const writeGridPlacement = (node: SceneNode, parent: BaseNode, out: SerializedNode): void => {
  const isFlowed = fieldOf(parent, 'gridItemsPositioning') === 'ROW_AUTO_FLOW';
  const gridChild = serializeGridChild(node, isFlowed);
  if (gridChild !== undefined) out.gridChild = gridChild;
};

const writeLayoutChildFields = (node: SceneNode, out: SerializedNode): void => {
  const sizingHorizontal = stringFieldOf(node, 'layoutSizingHorizontal');
  if (sizingHorizontal !== undefined) out.layoutSizingHorizontal = sizingHorizontal;
  const sizingVertical = stringFieldOf(node, 'layoutSizingVertical');
  if (sizingVertical !== undefined) out.layoutSizingVertical = sizingVertical;
  const grow = numberFieldOf(node, 'layoutGrow');
  if (grow !== undefined && grow !== 0) out.layoutGrow = grow;
  const align = stringFieldOf(node, 'layoutAlign');
  if (align !== undefined && align !== INHERITED_ALIGN) out.layoutAlign = align;
  if (fieldOf(node, 'layoutPositioning') === 'ABSOLUTE') out.layoutPositioning = 'ABSOLUTE';
};

const writeConstraints = (node: SceneNode, out: SerializedNode): void => {
  const constraints = fieldOf(node, 'constraints');
  if (typeof constraints !== 'object' || constraints === null) return;
  if (!('horizontal' in constraints) || !('vertical' in constraints)) return;
  out.constraints = {
    horizontal: String(constraints.horizontal),
    vertical: String(constraints.vertical),
  };
};

export const writePlacementFields = (
  node: SceneNode,
  parent: BaseNode | null,
  out: SerializedNode,
): void => {
  const hasParentLayout = parent !== null && 'layoutMode' in parent;
  const parentLayoutMode = hasParentLayout ? parent.layoutMode : undefined;
  if (!hasParentLayout || parentLayoutMode === 'NONE') {
    writeConstraints(node, out);
    return;
  }
  writeLayoutChildFields(node, out);
  if (parentLayoutMode === 'GRID') writeGridPlacement(node, parent, out);
};
