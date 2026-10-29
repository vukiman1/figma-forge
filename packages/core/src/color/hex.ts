import type { SerializedColor } from '../model/primitives.js';

const BYTE_MAX = 255;
const HEX_RADIX = 16;

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

const channel = (n: number): string =>
  Math.round(clamp01(n) * BYTE_MAX)
    .toString(HEX_RADIX)
    .padStart(2, '0');

export const toHex = (color: SerializedColor, alpha?: number): string => {
  const base = `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
  const withAlpha = alpha !== undefined && alpha < 1 ? base + channel(alpha) : base;
  return withAlpha.toUpperCase();
};
