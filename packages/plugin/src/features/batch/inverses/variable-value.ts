import { SET_VARIABLE_VALUE_TOOL_NAME, setVariableValueParams } from '@figma-forge/core';

import { toPlainJson } from '../../motion/node-motion.js';
import { requireVariable } from '../../variables/lookup.js';
import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { same } from '../snapshot/values.js';

const TOOL = batchTool(SET_VARIABLE_VALUE_TOOL_NAME);

interface VariableValueState {
  readonly id: string;
  readonly modeId: string;
  readonly previous: VariableValue;
}

const notOwnMode = (modeId: string, variable: Variable): Error =>
  new Error(
    `${TOOL}: mode ${modeId} is not a mode of ${variable.name}'s own collection — ` +
      'a value written through an extended collection is an override with no verified inverse',
  );

export const setVariableValueInverse: BatchInverse = defineInverse(
  SET_VARIABLE_VALUE_TOOL_NAME,
  setVariableValueParams,
  {
    capture: async (figmaCtx, { variableId, modeId }): Promise<VariableValueState> => {
      const variable = await requireVariable(figmaCtx, TOOL, variableId);
      const collection = await figmaCtx.variables.getVariableCollectionByIdAsync(
        variable.variableCollectionId,
      );
      const previous = variable.valuesByMode[modeId];
      const isOwnMode = collection?.modes.some(mode => mode.modeId === modeId) === true;
      if (!isOwnMode || previous === undefined) throw notOwnMode(modeId, variable);
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a JSON round-trip of a Figma VariableValue keeps its shape
      return { id: variableId, modeId, previous: toPlainJson(previous) as VariableValue };
    },
    undo: async (figmaCtx, { id, modeId, previous }) => {
      const variable = await figmaCtx.variables.getVariableByIdAsync(id);
      if (variable !== null && !same(variable.valuesByMode[modeId], previous)) {
        variable.setValueForMode(modeId, previous);
      }
      return undefined;
    },
  },
);
