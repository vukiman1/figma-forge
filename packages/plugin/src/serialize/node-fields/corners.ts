import { MIXED, type SerializedNode } from '@figma-forge/core';

import { fieldOf, numberFieldOf } from '../field-of.js';

type CornerRadii = NonNullable<SerializedNode['cornerRadii']>;

const cornerRadiiOf = (node: SceneNode): CornerRadii | undefined => {
  const topLeft = numberFieldOf(node, 'topLeftRadius');
  const topRight = numberFieldOf(node, 'topRightRadius');
  const bottomRight = numberFieldOf(node, 'bottomRightRadius');
  const bottomLeft = numberFieldOf(node, 'bottomLeftRadius');
  if (
    topLeft === undefined ||
    topRight === undefined ||
    bottomRight === undefined ||
    bottomLeft === undefined
  ) {
    return undefined;
  }
  return { topLeft, topRight, bottomRight, bottomLeft };
};

const writeCornerRadius = (node: SceneNode, out: SerializedNode): void => {
  if (node.type === 'TEXT_PATH' || !('cornerRadius' in node)) return;
  const radius = fieldOf(node, 'cornerRadius');
  if (typeof radius === 'number') {
    out.cornerRadius = radius;
    return;
  }
  out.cornerRadius = MIXED;
  const radii = cornerRadiiOf(node);
  if (radii !== undefined) out.cornerRadii = radii;
};

export const writeCornerFields = (node: SceneNode, out: SerializedNode): void => {
  writeCornerRadius(node, out);
  const smoothing = numberFieldOf(node, 'cornerSmoothing');
  if (smoothing !== undefined && smoothing !== 0) out.cornerSmoothing = smoothing;
};
