import {
  type SerializedMotionEasing,
  type SerializedVariableComposedColor,
  type SerializedVariableValue,
  toHex,
} from '@figma-forge/core';

export const isAlias = (
  value: SerializedVariableValue,
): value is { type: 'VARIABLE_ALIAS'; id: string } =>
  typeof value === 'object' && value !== null && 'type' in value && value.type === 'VARIABLE_ALIAS';

export const isRgba = (
  value: SerializedVariableValue,
): value is { r: number; g: number; b: number; a: number } =>
  typeof value === 'object' && value !== null && 'r' in value && 'g' in value && 'b' in value;

export const isComposedColor = (
  value: SerializedVariableValue,
): value is SerializedVariableComposedColor =>
  typeof value === 'object' && value !== null && 'color' in value && 'opacity' in value;

export const withAlpha = (hex: string, alpha: number): string | null => {
  if (!/^#[0-9a-f]{6}/i.test(hex)) return null;
  const channel = (at: number): number => Number.parseInt(hex.slice(at, at + 2), 16) / 255;
  return toHex({ r: channel(1), g: channel(3), b: channel(5) }, alpha);
};

export const formatEasing = (value: SerializedMotionEasing): string => {
  const bezier = value.easingFunctionCubicBezier;
  if (bezier !== undefined) {
    return `cubic-bezier(${bezier.x1}, ${bezier.y1}, ${bezier.x2}, ${bezier.y2})`;
  }
  const spring = value.easingFunctionSpring;
  return spring === undefined ? value.type : `spring(${spring.bounce})`;
};
