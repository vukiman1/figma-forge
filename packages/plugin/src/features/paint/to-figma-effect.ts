import type { EffectInput } from '@figma-forge/core';

import { toDocumentRgba } from '../color-space.js';

type ShadowType = DropShadowEffect['type'] | InnerShadowEffect['type'];

const toShadow = (
  figmaCtx: typeof figma,
  effect: EffectInput,
  type: ShadowType,
): DropShadowEffect | InnerShadowEffect => {
  if (effect.color === undefined || effect.offset === undefined) {
    throw new TypeError(`${type} requires color and offset`);
  }
  const shadow = {
    visible: effect.visible,
    radius: effect.radius ?? 0,
    color: toDocumentRgba(figmaCtx, effect.color, type),
    offset: { x: effect.offset.x, y: effect.offset.y },
    spread: effect.spread ?? 0,
    blendMode: effect.blendMode ?? 'NORMAL',
  };
  if (type === 'INNER_SHADOW') return { type, ...shadow };
  return { type, ...shadow, showShadowBehindNode: effect.showShadowBehindNode === true };
};

export const toFigmaEffect = (effect: EffectInput, figmaCtx: typeof figma): Effect => {
  const { type } = effect;
  if (type === 'DROP_SHADOW' || type === 'INNER_SHADOW') return toShadow(figmaCtx, effect, type);
  return { type, blurType: 'NORMAL', visible: effect.visible, radius: effect.radius ?? 0 };
};
