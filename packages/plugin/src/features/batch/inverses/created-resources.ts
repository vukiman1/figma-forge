import {
  ADD_VARIABLE_MODE_TOOL_NAME,
  addVariableModeParams,
  CREATE_EFFECT_STYLE_TOOL_NAME,
  CREATE_GRID_STYLE_TOOL_NAME,
  CREATE_PAINT_STYLE_TOOL_NAME,
  CREATE_TEXT_STYLE_TOOL_NAME,
  CREATE_VARIABLE_COLLECTION_TOOL_NAME,
  CREATE_VARIABLE_TOOL_NAME,
  createEffectStyleParams,
  createGridStyleParams,
  createPaintStyleParams,
  createTextStyleParams,
  createVariableCollectionParams,
  createVariableParams,
} from '@figma-forge/core';
import type { z } from 'zod';

import { type BatchInverse, defineInverse } from '../inverse.js';
import { resultId } from '../op-result.js';

type RemoveCreated<P> = (figmaCtx: typeof figma, id: string, params: P) => Promise<void>;

export const createdInverse = <Schema extends z.ZodType>(
  tool: string,
  schema: Schema,
  key: string,
  remove: RemoveCreated<z.output<Schema>>,
): BatchInverse =>
  defineInverse(tool, schema, {
    capture: async (_figmaCtx, params) => params,
    undo: async (figmaCtx, params, result) => {
      const id = resultId(result, key);
      if (id !== null) await remove(figmaCtx, id, params);
      return undefined;
    },
  });

export const removeStyle = async (figmaCtx: typeof figma, id: string): Promise<void> => {
  (await figmaCtx.getStyleByIdAsync(id))?.remove();
};

const STYLE_ID_KEY = 'styleId';

export const createPaintStyleInverse: BatchInverse = createdInverse(
  CREATE_PAINT_STYLE_TOOL_NAME,
  createPaintStyleParams,
  STYLE_ID_KEY,
  removeStyle,
);
export const createEffectStyleInverse: BatchInverse = createdInverse(
  CREATE_EFFECT_STYLE_TOOL_NAME,
  createEffectStyleParams,
  STYLE_ID_KEY,
  removeStyle,
);
export const createGridStyleInverse: BatchInverse = createdInverse(
  CREATE_GRID_STYLE_TOOL_NAME,
  createGridStyleParams,
  STYLE_ID_KEY,
  removeStyle,
);
export const createTextStyleInverse: BatchInverse = createdInverse(
  CREATE_TEXT_STYLE_TOOL_NAME,
  createTextStyleParams,
  STYLE_ID_KEY,
  removeStyle,
);

export const createVariableCollectionInverse: BatchInverse = createdInverse(
  CREATE_VARIABLE_COLLECTION_TOOL_NAME,
  createVariableCollectionParams,
  'collectionId',
  async (figmaCtx, id) => {
    (await figmaCtx.variables.getVariableCollectionByIdAsync(id))?.remove();
  },
);

export const createVariableInverse: BatchInverse = createdInverse(
  CREATE_VARIABLE_TOOL_NAME,
  createVariableParams,
  'variableId',
  async (figmaCtx, id) => {
    (await figmaCtx.variables.getVariableByIdAsync(id))?.remove();
  },
);

export const addVariableModeInverse: BatchInverse = createdInverse(
  ADD_VARIABLE_MODE_TOOL_NAME,
  addVariableModeParams,
  'modeId',
  async (figmaCtx, modeId, { collectionId }) => {
    const collection = await figmaCtx.variables.getVariableCollectionByIdAsync(collectionId);
    if (collection?.modes.some(mode => mode.modeId === modeId) === true) {
      collection.removeMode(modeId);
    }
  },
);
