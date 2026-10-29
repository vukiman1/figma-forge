import { MIXED, type SerializedEffect, type SerializedNode } from '@figma-forge/core';

import { serializeEffect } from '../effect.js';
import { fieldOf } from '../field-of.js';
import { paintIsDrawn } from '../paint-is-drawn.js';
import type { PaintOwnerSize } from '../paint.js';
import { isEffectList } from './figma-lists.js';

const hasNoDrawnFill = (out: SerializedNode): boolean =>
  out.fills !== undefined && out.fills !== MIXED && !out.fills.some(paint => paintIsDrawn(paint));

const markUndrawnBackgroundBlurs = (effects: readonly SerializedEffect[]): void => {
  for (const effect of effects) {
    if (effect.type === 'BACKGROUND_BLUR' && effect.visible) effect.drawn = false;
  }
};

export const writeEffects = (
  node: SceneNode,
  out: SerializedNode,
  ownerSize: PaintOwnerSize | null,
): void => {
  const effects = fieldOf(node, 'effects');
  if (!isEffectList(effects) || effects.length === 0) return;
  const serialized = effects.map(effect => serializeEffect(effect, ownerSize));
  out.effects = serialized;
  if (hasNoDrawnFill(out)) markUndrawnBackgroundBlurs(serialized);
};
