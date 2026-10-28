import type { SerializedEffect } from '@figma-forge/core';

type SerializedVector = NonNullable<SerializedEffect['noiseSizeVector']>;
type SerializedRgba = NonNullable<SerializedEffect['color']>;

const sizeVector = (size: number, vector: Vector | undefined): SerializedVector =>
  vector === undefined ? { x: size, y: size } : { x: vector.x, y: vector.y };

const rgbaOf = (color: RGBA): SerializedRgba => ({
  r: color.r,
  g: color.g,
  b: color.b,
  a: color.a,
});

export const serializeNoise = (noise: NoiseEffect): Partial<SerializedEffect> => {
  const out: Partial<SerializedEffect> = {
    noiseType: noise.noiseType,
    noiseSizeVector: sizeVector(noise.noiseSize, noise.noiseSizeVector),
    density: noise.density,
  };
  if (noise.noiseType === 'MULTITONE') out.opacity = noise.opacity;
  else out.color = rgbaOf(noise.color);
  if (noise.noiseType === 'DUOTONE') out.secondaryColor = rgbaOf(noise.secondaryColor);
  return out;
};

export const serializeTexture = (texture: TextureEffect): Partial<SerializedEffect> => ({
  noiseSizeVector: sizeVector(texture.noiseSize, texture.noiseSizeVector),
  clipToShape: texture.clipToShape,
});

const splayOf = (glass: GlassEffect): unknown => ('splay' in glass ? glass.splay : undefined);

export const serializeGlass = (glass: GlassEffect): Partial<SerializedEffect> => {
  const out: Partial<SerializedEffect> = {
    lightIntensity: glass.lightIntensity,
    lightAngle: glass.lightAngle,
    refraction: glass.refraction,
    depth: glass.depth,
    dispersion: glass.dispersion,
  };
  const splay = splayOf(glass);
  if (typeof splay === 'number') out.splay = splay;
  return out;
};
