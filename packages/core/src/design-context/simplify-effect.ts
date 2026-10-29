import { toHex } from '../color/hex.js';
import type { SerializedEffect } from '../model/effect.js';
import { pickDefined } from '../object/pick-defined.js';
import { simplifyShaderProperties } from './simplify-shader.js';

const GEOMETRY_KEYS = ['offset', 'radius', 'spread', 'shaderId'] as const;

const NOISE_KEYS = ['noiseType', 'noiseSizeVector', 'density'] as const;

const PASSTHROUGH_KEYS = [
  'opacity',
  'showShadowBehindNode',
  'blendMode',
  'clipToShape',
  'lightIntensity',
  'lightAngle',
  'refraction',
  'depth',
  'dispersion',
  'splay',
  'blurType',
  'startRadius',
  'startOffset',
  'endOffset',
  'cssLayers',
  'drawn',
] as const;

export const simplifyEffect = (effect: SerializedEffect) => ({
  type: effect.type,
  ...(effect.color === undefined ? {} : { color: toHex(effect.color, effect.color.a) }),
  ...pickDefined(effect, GEOMETRY_KEYS),
  ...(effect.shaderProperties === undefined
    ? {}
    : { shaderProperties: simplifyShaderProperties(effect.shaderProperties) }),
  ...pickDefined(effect, NOISE_KEYS),
  ...(effect.secondaryColor === undefined
    ? {}
    : { secondaryColor: toHex(effect.secondaryColor, effect.secondaryColor.a) }),
  ...pickDefined(effect, PASSTHROUGH_KEYS),
  ...(effect.visible ? {} : { visible: false as const }),
});
