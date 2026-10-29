import type { SerializedBindings, SerializedEffect } from '@figma-forge/core';

import { collectBindings } from './bindings.js';
import { serializeProgressiveBlur } from './effect-blur.js';
import { serializeGlass, serializeNoise, serializeTexture } from './effect-textures.js';
import type { PaintOwnerSize } from './paint-types.js';
import { serializeShader } from './shader.js';

type ShadowEffect = DropShadowEffect | InnerShadowEffect;

const isShadow = (effect: Effect): effect is ShadowEffect =>
  effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW';

const boundVariablesOf = (effect: Effect): unknown =>
  'boundVariables' in effect ? effect.boundVariables : undefined;

const serializeShadow = (
  effect: ShadowEffect,
  bound: SerializedBindings | undefined,
): SerializedEffect => {
  const shadow: SerializedEffect = {
    type: effect.type,
    visible: effect.visible,
    radius: effect.radius,
    color: { r: effect.color.r, g: effect.color.g, b: effect.color.b, a: effect.color.a },
    offset: { x: effect.offset.x, y: effect.offset.y },
    spread: effect.spread ?? 0,
    ...(bound === undefined ? {} : { boundVariables: bound }),
  };
  if (effect.type === 'DROP_SHADOW' && effect.showShadowBehindNode === true) {
    shadow.showShadowBehindNode = true;
  }
  if (typeof effect.blendMode === 'string' && effect.blendMode !== 'NORMAL') {
    shadow.blendMode = effect.blendMode;
  }
  return shadow;
};

const effectSettings = (
  effect: Exclude<Effect, ShadowEffect>,
  ownerSize: PaintOwnerSize | null,
): Partial<SerializedEffect> => {
  if (effect.type === 'SHADER') return serializeShader(effect);
  if (effect.type === 'NOISE') return serializeNoise(effect);
  if (effect.type === 'TEXTURE') return serializeTexture(effect);
  if (effect.type === 'GLASS') return serializeGlass(effect);
  if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
    return serializeProgressiveBlur(effect, ownerSize);
  }
  return {};
};

export const serializeEffect = (
  effect: Effect,
  ownerSize: PaintOwnerSize | null,
): SerializedEffect => {
  const bound = collectBindings(boundVariablesOf(effect));
  if (isShadow(effect)) return serializeShadow(effect, bound);
  const out: SerializedEffect = { type: effect.type, visible: effect.visible };
  if ('radius' in effect && typeof effect.radius === 'number') out.radius = effect.radius;
  Object.assign(out, effectSettings(effect, ownerSize));
  if (bound !== undefined) out.boundVariables = bound;
  return out;
};
