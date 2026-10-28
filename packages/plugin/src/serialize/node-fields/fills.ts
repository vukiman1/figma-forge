import { MIXED, type SerializedNode } from '@figma-forge/core';

import { type PaintOwnerSize, serializePaint } from '../paint.js';
import { isPaintList } from './figma-lists.js';

export const ownerSizeOf = (out: SerializedNode): PaintOwnerSize | null =>
  typeof out.width === 'number' && typeof out.height === 'number'
    ? { width: out.width, height: out.height }
    : null;

export const writeFills = (
  node: SceneNode,
  out: SerializedNode,
  ownerSize: PaintOwnerSize | null,
): void => {
  if (!('fills' in node)) return;
  const fills: unknown = Reflect.get(node, 'fills');
  out.fills = isPaintList(fills) ? fills.map(paint => serializePaint(paint, ownerSize)) : MIXED;
};
