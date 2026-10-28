import { UPDATE_TEXT_STYLE_TOOL_NAME, updateTextStyleParams } from '@figma-forge/core';

import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { loadFonts } from '../snapshot/text-capture.js';
import { pickFields } from '../snapshot/values.js';
import { restoreStyleValues, type StyleState } from './shared-styles.js';

const TEXT_STYLE_PROPS = [
  'name',
  'description',
  'fontName',
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'paragraphSpacing',
  'paragraphIndent',
  'textWrapStyle',
] as const;

const TEXT_STYLE_BINDABLE = [
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'paragraphSpacing',
  'paragraphIndent',
] as const satisfies readonly VariableBindableTextField[];

type TextStyleBindings = Readonly<Partial<Record<VariableBindableTextField, string | null>>>;

interface TextStyleState extends StyleState {
  readonly fontName: FontName;
  readonly bindings: TextStyleBindings;
  readonly consumers: readonly string[];
}

const textStyleBinding = (style: TextStyle, field: VariableBindableTextField): string | null =>
  style.boundVariables?.[field]?.id ?? null;

const textStyleOf = async (figmaCtx: typeof figma, id: string): Promise<TextStyle | null> => {
  const style = await figmaCtx.getStyleByIdAsync(id);
  return style?.type === 'TEXT' ? style : null;
};

const captureTextStyle = async (id: string, style: TextStyle): Promise<TextStyleState> => ({
  id,
  values: pickFields(style, TEXT_STYLE_PROPS),
  fontName: style.fontName,
  bindings: Object.fromEntries(
    TEXT_STYLE_BINDABLE.map(field => [field, textStyleBinding(style, field)]),
  ),
  consumers: (await style.getStyleConsumersAsync()).map(consumer => consumer.node.id),
});

const unbindAdded = (style: TextStyle, bindings: TextStyleBindings): void => {
  for (const field of TEXT_STYLE_BINDABLE) {
    if (bindings[field] === null && textStyleBinding(style, field) !== null) {
      style.setBoundVariable(field, null);
    }
  }
};

const rebindRemoved = async (
  figmaCtx: typeof figma,
  style: TextStyle,
  bindings: TextStyleBindings,
): Promise<void> => {
  for (const field of TEXT_STYLE_BINDABLE) {
    const id = bindings[field];
    if (id === null || id === undefined || textStyleBinding(style, field) === id) continue;
    // oxlint-disable-next-line no-await-in-loop -- a style has at most eight bindable fields
    const variable = await figmaCtx.variables.getVariableByIdAsync(id);
    if (variable === null) throw new Error(`variable ${id} bound to ${field} no longer exists`);
    style.setBoundVariable(field, variable);
  }
};

export const updateTextStyleInverse: BatchInverse = defineInverse(
  UPDATE_TEXT_STYLE_TOOL_NAME,
  updateTextStyleParams,
  {
    capture: async (figmaCtx, { styleId }) => {
      const style = await textStyleOf(figmaCtx, styleId);
      if (style === null) {
        throw new Error(
          `${batchTool(UPDATE_TEXT_STYLE_TOOL_NAME)}: text style ${styleId} not found`,
        );
      }
      return captureTextStyle(styleId, style);
    },
    undo: async (figmaCtx, state) => {
      const style = await textStyleOf(figmaCtx, state.id);
      if (style === null) return undefined;
      await loadFonts(figmaCtx, [state.fontName, style.fontName]);
      unbindAdded(style, state.bindings);
      restoreStyleValues(style, state.values);
      await rebindRemoved(figmaCtx, style, state.bindings);
      return undefined;
    },
    resizes: ({ consumers }) => consumers,
  },
);
