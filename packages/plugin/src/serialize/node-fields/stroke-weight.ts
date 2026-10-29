import { MIXED, type SerializedNode } from '@figma-forge/core';

import { fieldOf, numberFieldOf } from '../field-of.js';

type StrokeWeights = NonNullable<SerializedNode['strokeWeights']>;

const strokeWeightsOf = (node: SceneNode): StrokeWeights | undefined => {
  const top = numberFieldOf(node, 'strokeTopWeight');
  const right = numberFieldOf(node, 'strokeRightWeight');
  const bottom = numberFieldOf(node, 'strokeBottomWeight');
  const left = numberFieldOf(node, 'strokeLeftWeight');
  if (top === undefined || right === undefined || bottom === undefined || left === undefined) {
    return undefined;
  }
  return { top, right, bottom, left };
};

export const writeStrokeWeight = (node: SceneNode, out: SerializedNode): void => {
  const weight = fieldOf(node, 'strokeWeight');
  if (typeof weight === 'number') {
    out.strokeWeight = weight;
    return;
  }
  out.strokeWeight = MIXED;
  const weights = strokeWeightsOf(node);
  if (weights !== undefined) out.strokeWeights = weights;
};
