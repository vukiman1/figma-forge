import {
  UPDATE_EFFECT_STYLE_TOOL_NAME,
  UPDATE_PAINT_STYLE_TOOL_NAME,
  updateEffectStyleParams,
  updatePaintStyleParams,
} from '@figma-forge/core';
import type { z } from 'zod';

import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { readField, writeIfDifferent } from '../snapshot/values.js';

export interface StyleState {
  readonly id: string;
  readonly values: Readonly<Record<string, unknown>>;
}

export const restoreStyleValues = (style: BaseStyle, values: StyleState['values']): void => {
  for (const [key, value] of Object.entries(values)) writeIfDifferent(style, key, value);
};

export const styleInverse = (
  tool: string,
  schema: z.ZodType<{ styleId: string }>,
  type: StyleType,
  valueProp: string,
): BatchInverse =>
  defineInverse(tool, schema, {
    capture: async (figmaCtx, { styleId }): Promise<StyleState> => {
      const style = await figmaCtx.getStyleByIdAsync(styleId);
      if (style?.type !== type) {
        throw new Error(`${batchTool(tool)}: ${type.toLowerCase()} style ${styleId} not found`);
      }
      const { name, description } = style;
      return {
        id: styleId,
        values: { name, description, [valueProp]: readField(style, valueProp) },
      };
    },
    undo: async (figmaCtx, { id, values }) => {
      const style = await figmaCtx.getStyleByIdAsync(id);
      if (style !== null) restoreStyleValues(style, values);
      return undefined;
    },
  });

export const updatePaintStyleInverse: BatchInverse = styleInverse(
  UPDATE_PAINT_STYLE_TOOL_NAME,
  updatePaintStyleParams,
  'PAINT',
  'paints',
);

export const updateEffectStyleInverse: BatchInverse = styleInverse(
  UPDATE_EFFECT_STYLE_TOOL_NAME,
  updateEffectStyleParams,
  'EFFECT',
  'effects',
);
