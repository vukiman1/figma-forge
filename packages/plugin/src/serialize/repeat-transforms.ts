import type { SerializedTransformModifier } from '@figma-forge/core';

import { type Affine, compose, IDENTITY, invert } from '../geometry/affine.js';
import { type Box, contentBoxOf, type RepeatChild } from './repeat-box.js';
import { asRepeat, repeatStep } from './repeat-modifiers.js';
import { round2 } from './rounding.js';

export type { RepeatChild } from './repeat-box.js';

export const MAX_REPEAT_TRANSFORMS = 100;

const HALF_TURN_DEG = 180;

const cssOf = (m: Affine): string => {
  const deg = round2((Math.atan2(m[1][0], m[0][0]) * HALF_TURN_DEG) / Math.PI);
  const move = `translate(${round2(m[0][2])}px, ${round2(m[1][2])}px)`;
  return deg === 0 ? move : `${move} rotate(${deg}deg)`;
};

const product = (outers: readonly Affine[], inners: readonly Affine[]): Affine[] =>
  outers.flatMap(outer => inners.map(inner => compose(outer, inner)));

const copiesOf = (
  start: Box,
  modifiers: readonly SerializedTransformModifier[],
): Affine[] | undefined => {
  let content = start;
  let copies: Affine[] = [IDENTITY];
  for (const modifier of modifiers) {
    const repeat = asRepeat(modifier);
    const step = repeat === undefined ? undefined : repeatStep(repeat, content);
    if (step === undefined) return undefined;
    content = step.content;
    copies = product(step.steps, copies);
    if (copies.length - 1 > MAX_REPEAT_TRANSFORMS) return undefined;
  }
  return copies;
};

const inParentAxes = (copies: readonly Affine[], axes: Affine): string[] | undefined => {
  const back = invert(axes);
  if (back === null) return undefined;
  return copies.map(copy => cssOf(compose(compose(axes, copy), back)));
};

export const repeatTransforms = (
  groupTransform: Affine,
  children: readonly RepeatChild[],
  modifiers: readonly SerializedTransformModifier[],
  axes?: Affine,
): string[] | undefined => {
  if (modifiers.length === 0 || children.length === 0) return undefined;
  const content = contentBoxOf(groupTransform, children);
  if (content === undefined) return undefined;
  const copies = copiesOf(content, modifiers);
  if (copies === undefined) return undefined;
  const repeated = copies.slice(1);
  if (axes === undefined) return repeated.map(cssOf);
  return inParentAxes(repeated, axes);
};
