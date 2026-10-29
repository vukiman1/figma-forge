import { ALIGN_NODES_TOOL_NAME as TOOL } from '@figma-forge/core';

import {
  type Affine,
  IDENTITY,
  invert,
  linearPartOf,
  translationOf,
} from '../../geometry/affine.js';
import { hasField } from '../require-node.js';
import { type Box, boxInSpace, isPlaced, type PlacedNode } from './node-box.js';

export interface AlignTarget {
  readonly node: SceneNode & PlacedNode;
  readonly box: Box;
  readonly space: Affine;
  readonly parentBounds: Box | null;
  readonly canvasBox: Box;
}

const enclosingInstance = (node: BaseNode): BaseNode | null => {
  for (let up = node.parent; up !== null; up = up.parent) {
    if (up.type === 'INSTANCE') return up;
  }
  return null;
};

const ancestorIn = (node: BaseNode, ids: ReadonlySet<string>): BaseNode | null => {
  for (let up = node.parent; up !== null; up = up.parent) {
    if (ids.has(up.id)) return up;
  }
  return null;
};

const isInFlow = (node: BaseNode): boolean => {
  const parent = node.parent;
  if (parent === null || !hasField(parent, 'layoutMode') || parent.layoutMode === 'NONE') {
    return false;
  }
  return hasField(node, 'layoutPositioning') && node.layoutPositioning !== 'ABSOLUTE';
};

const requireMovable = (node: BaseNode, ids: ReadonlySet<string>): void => {
  const instance = enclosingInstance(node);
  if (instance !== null) {
    throw new Error(
      `${TOOL}: node ${node.id} is a layer inside instance ${instance.id}, whose sublayers ` +
        `cannot be moved — align the instance itself, or edit its main component.`,
    );
  }
  const ancestor = ancestorIn(node, ids);
  if (ancestor !== null) {
    throw new Error(
      `${TOOL}: node ${node.id} is inside ${ancestor.id}, which is also being aligned — moving ` +
        `${ancestor.id} already carries it. Align them in separate calls.`,
    );
  }
  if (!isInFlow(node)) return;
  throw new Error(
    `${TOOL}: node ${node.id} is an in-flow child of an auto-layout frame — the layout ` +
      `controls its position and would reflow it back. Align it with the parent's ` +
      `primaryAxisAlignItems / counterAxisAlignItems or its own layoutAlign instead, or ` +
      `set layoutPositioning ABSOLUTE (set_layout_props) first.`,
  );
};

const measureInParent = (node: SceneNode & PlacedNode, canvasBox: Box): AlignTarget => {
  const parent = node.parent;
  if (parent === null || !isPlaced(parent)) {
    throw new Error(
      `${TOOL}: node ${node.id} sits directly on a page, which has no bounds to align ` +
        `within — use relativeTo SELECTION to align it to the other nodes`,
    );
  }
  const space = linearPartOf(parent.absoluteTransform);
  const toSpace = invert(space);
  if (toSpace === null) {
    throw new Error(`${TOOL}: parent ${parent.id} is scaled to zero, so has no axes`);
  }
  return {
    node,
    box: boxInSpace(node, toSpace, translationOf(parent.absoluteTransform)),
    space,
    parentBounds: { x: 0, y: 0, width: parent.width, height: parent.height },
    canvasBox,
  };
};

export const toAlignTarget = (
  node: BaseNode,
  ids: ReadonlySet<string>,
  isMeasuredOnCanvas: boolean,
): AlignTarget => {
  if (!isPlaced(node)) {
    throw new Error(`${TOOL}: node ${node.id} is a ${node.type}, which has no position to align`);
  }
  requireMovable(node, ids);
  const canvasBox = boxInSpace(node, IDENTITY, [0, 0]);
  if (!isMeasuredOnCanvas) return measureInParent(node, canvasBox);
  return { node, box: canvasBox, space: IDENTITY, parentBounds: null, canvasBox };
};
