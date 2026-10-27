import {
  type SerializedMotionEasing,
  type SerializedVariableColor,
  type SerializedVariableComposedColor,
  type SerializedVariableValue,
  toHex,
} from '@figma-forge/core';

const OPAQUE = 1;

const serializeMotionEasing = (easing: MotionEasing): SerializedMotionEasing => {
  const bezier = easing.easingFunctionCubicBezier;
  const spring = easing.easingFunctionSpring;
  return {
    type: easing.type,
    ...(bezier === undefined
      ? {}
      : {
          easingFunctionCubicBezier: { x1: bezier.x1, y1: bezier.y1, x2: bezier.x2, y2: bezier.y2 },
        }),
    ...(spring === undefined ? {} : { easingFunctionSpring: { bounce: spring.bounce } }),
  };
};

const serializeColor = (color: RGB | RGBA): SerializedVariableColor => {
  const a = 'a' in color ? color.a : OPAQUE;
  return { r: color.r, g: color.g, b: color.b, a, hex: toHex(color, a) };
};

const serializeComposedColor = (value: VariableComposedColor): SerializedVariableComposedColor => ({
  color:
    'type' in value.color
      ? { type: 'VARIABLE_ALIAS', id: value.color.id }
      : serializeColor(value.color),
  opacity:
    typeof value.opacity === 'number'
      ? value.opacity
      : { type: 'VARIABLE_ALIAS', id: value.opacity.id },
});

export const serializeVariableValue = (value: VariableValue): SerializedVariableValue => {
  if (typeof value !== 'object') return value;
  if ('type' in value && value.type === 'VARIABLE_ALIAS')
    return { type: 'VARIABLE_ALIAS', id: value.id };
  if ('type' in value) return serializeMotionEasing(value);
  if ('color' in value && 'opacity' in value) return serializeComposedColor(value);
  return serializeColor(value);
};
