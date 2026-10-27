import { SET_VARIABLE_VALUE_TOOL_NAME as TOOL, type VariableValueInput } from '@figma-forge/core';

import { toDocumentChannels } from '../../handlers/convert.js';

type ObjectValue = Extract<VariableValueInput, object>;
type ColorValue = Extract<ObjectValue, { r: number }>;
type ComposedValue = Extract<ObjectValue, { color: unknown }>;
type EasingValue = Exclude<ObjectValue, ColorValue | ComposedValue | { id: string }>;

const alias = (id: string): VariableAlias => ({ type: 'VARIABLE_ALIAS', id });

const hasRgb = <T extends object>(value: T): value is Extract<T, { r: number }> =>
  'r' in value && typeof value.r === 'number';

const isAlias = <T extends object>(value: T): value is Extract<T, { id: string }> =>
  'type' in value && value.type === 'VARIABLE_ALIAS';

const isComposed = (value: ObjectValue): value is ComposedValue =>
  'color' in value && 'opacity' in value;

const toFigmaColor = (figmaCtx: typeof figma, color: ColorValue): RGB | RGBA => ({
  ...toDocumentChannels(figmaCtx, color, TOOL),
  ...(color.a === undefined ? {} : { a: color.a }),
});

const toFigmaComposedColor = (
  figmaCtx: typeof figma,
  value: ComposedValue,
): VariableComposedColor => {
  const opacity = typeof value.opacity === 'number' ? value.opacity : alias(value.opacity.id);
  if (!hasRgb(value.color)) return { color: alias(value.color.id), opacity };
  if (typeof opacity === 'number') {
    throw new TypeError(
      `${TOOL}: a composed color needs an alias on at least one of color / opacity — ` +
        'a concrete color at a concrete opacity is just { r, g, b, a }',
    );
  }
  return { color: toFigmaColor(figmaCtx, value.color), opacity };
};

const toFigmaEasing = (easing: EasingValue): MotionEasing => ({
  type: easing.type,
  ...(easing.easingFunctionCubicBezier === undefined
    ? {}
    : { easingFunctionCubicBezier: easing.easingFunctionCubicBezier }),
  ...(easing.easingFunctionSpring === undefined
    ? {}
    : { easingFunctionSpring: easing.easingFunctionSpring }),
});

export const toFigmaVariableValue = (
  value: VariableValueInput,
  figmaCtx: typeof figma,
): VariableValue => {
  if (typeof value !== 'object') return value;
  if (hasRgb(value)) return toFigmaColor(figmaCtx, value);
  if (isComposed(value)) return toFigmaComposedColor(figmaCtx, value);
  if (isAlias(value)) return alias(value.id);
  return toFigmaEasing(value);
};
