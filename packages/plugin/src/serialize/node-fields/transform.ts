import type { SerializedNode } from '@figma-forge/core';

import { boundingBoxOf, orientationOf } from '../../geometry/orientation.js';
import { numberFieldOf } from '../field-of.js';

const hasOwnAxes = (node: SceneNode): boolean =>
  node.type !== 'GROUP' && node.type !== 'TRANSFORM_GROUP';

export const writeTransformFields = (node: SceneNode, out: SerializedNode): void => {
  const rotation = numberFieldOf(node, 'rotation');
  if (rotation !== undefined) out.rotation = rotation;
  const transform = 'relativeTransform' in node ? node.relativeTransform : undefined;
  if (transform === undefined || !hasOwnAxes(node)) return;
  const { flipped, cssTransform } = orientationOf(transform);
  if (flipped) out.flipped = true;
  if (cssTransform === undefined) return;
  out.cssTransform = cssTransform;
  out.boundingBox = boundingBoxOf(transform, node.width, node.height);
};
