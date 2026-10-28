import type { SerializedTransformModifier } from '@figma-forge/core';

import type { Affine } from '../geometry/affine.js';
import { fieldOf } from './field-of.js';
import { repeatTransforms } from './repeat-transforms.js';
import { round4 } from './rounding.js';

export interface RepeatFields {
  transformModifiers?: readonly SerializedTransformModifier[] | undefined;
  repeatTransforms?: readonly string[] | undefined;
}

const UPRIGHT: Transform = [
  [1, 0, 0],
  [0, 1, 0],
];

const serializeModifier = (m: unknown): SerializedTransformModifier => {
  const out: SerializedTransformModifier = { type: String(fieldOf(m, 'type')) };
  const repeatType = fieldOf(m, 'repeatType');
  if (repeatType === 'LINEAR' || repeatType === 'RADIAL') out.repeatType = repeatType;
  const axis = fieldOf(m, 'axis');
  if (axis === 'HORIZONTAL' || axis === 'VERTICAL') out.axis = axis;
  const unitType = fieldOf(m, 'unitType');
  if (unitType === 'RELATIVE' || unitType === 'PIXELS') out.unitType = unitType;
  const offset = fieldOf(m, 'offset');
  if (typeof offset === 'number') out.offset = round4(offset);
  const count = fieldOf(m, 'count');
  if (typeof count === 'number') out.count = count;
  return out;
};

export const serializeTransformModifiers = (raw: unknown): SerializedTransformModifier[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((m: unknown) => serializeModifier(m));
};

const parentAxesOf = (node: TransformGroupNode): Affine | undefined => {
  const relative: Transform | undefined = node.relativeTransform;
  const [[a, c], [b, d]] = relative ?? UPRIGHT;
  const isUpright = a === 1 && b === 0 && c === 0 && d === 1;
  if (isUpright) return undefined;
  return [
    [a, c, 0],
    [b, d, 0],
  ];
};

export const applyRepeat = (node: TransformGroupNode, raw: unknown, out: RepeatFields): void => {
  const modifiers = serializeTransformModifiers(raw);
  if (modifiers.length === 0) return;
  out.transformModifiers = modifiers;
  const transforms = repeatTransforms(
    node.absoluteTransform,
    node.children,
    modifiers,
    parentAxesOf(node),
  );
  if (transforms !== undefined && transforms.length > 0) out.repeatTransforms = transforms;
};
