import {
  RENAME_VARIABLE_TOOL_NAME,
  renameVariableParams,
  SET_VARIABLE_CODE_SYNTAX_TOOL_NAME,
  setVariableCodeSyntaxParams,
  UPDATE_VARIABLE_COLLECTION_TOOL_NAME,
  updateVariableCollectionParams,
} from '@figma-forge/core';

import { requireVariable } from '../../variables/lookup.js';
import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';

const PLATFORMS = ['WEB', 'ANDROID', 'iOS'] as const satisfies readonly CodeSyntaxPlatform[];

type CodeSyntax = Variable['codeSyntax'];

interface CodeSyntaxState {
  readonly id: string;
  readonly previous: CodeSyntax;
  readonly platforms: readonly CodeSyntaxPlatform[];
}

interface VariableNameState {
  readonly id: string;
  readonly name: string;
}

interface ModeName {
  readonly modeId: string;
  readonly name: string;
}

interface CollectionNames {
  readonly id: string;
  readonly name: string;
  readonly modes: readonly ModeName[];
}

const restorePlatform = (
  variable: Variable,
  platform: CodeSyntaxPlatform,
  was: string | undefined,
): void => {
  if (was === variable.codeSyntax[platform]) return;
  if (was === undefined) variable.removeVariableCodeSyntax(platform);
  else variable.setVariableCodeSyntax(platform, was);
};

export const setVariableCodeSyntaxInverse: BatchInverse = defineInverse(
  SET_VARIABLE_CODE_SYNTAX_TOOL_NAME,
  setVariableCodeSyntaxParams,
  {
    capture: async (figmaCtx, { variableId, codeSyntax }): Promise<CodeSyntaxState> => {
      const tool = batchTool(SET_VARIABLE_CODE_SYNTAX_TOOL_NAME);
      const variable = await requireVariable(figmaCtx, tool, variableId);
      return {
        id: variableId,
        previous: { ...variable.codeSyntax },
        platforms: PLATFORMS.filter(platform => platform in codeSyntax),
      };
    },
    undo: async (figmaCtx, { id, previous, platforms }) => {
      const variable = await figmaCtx.variables.getVariableByIdAsync(id);
      if (variable === null) return undefined;
      for (const platform of platforms) restorePlatform(variable, platform, previous[platform]);
      return undefined;
    },
  },
);

export const renameVariableInverse: BatchInverse = defineInverse(
  RENAME_VARIABLE_TOOL_NAME,
  renameVariableParams,
  {
    capture: async (figmaCtx, { variableId }): Promise<VariableNameState> => {
      const tool = batchTool(RENAME_VARIABLE_TOOL_NAME);
      const variable = await requireVariable(figmaCtx, tool, variableId);
      return { id: variableId, name: variable.name };
    },
    undo: async (figmaCtx, { id, name }) => {
      const variable = await figmaCtx.variables.getVariableByIdAsync(id);
      if (variable !== null && variable.name !== name) variable.name = name;
      return undefined;
    },
  },
);

const restoreModeNames = (collection: VariableCollection, modes: readonly ModeName[]): void => {
  const renamed = modes.filter(mode =>
    collection.modes.some(now => now.modeId === mode.modeId && now.name !== mode.name),
  );
  for (const mode of renamed) collection.renameMode(mode.modeId, mode.name);
};

export const updateVariableCollectionInverse: BatchInverse = defineInverse(
  UPDATE_VARIABLE_COLLECTION_TOOL_NAME,
  updateVariableCollectionParams,
  {
    capture: async (figmaCtx, { collectionId }): Promise<CollectionNames> => {
      const collection = await figmaCtx.variables.getVariableCollectionByIdAsync(collectionId);
      if (collection === null) {
        const tool = batchTool(UPDATE_VARIABLE_COLLECTION_TOOL_NAME);
        throw new Error(`${tool}: collection ${collectionId} not found`);
      }
      return {
        id: collectionId,
        name: collection.name,
        modes: collection.modes.map(({ modeId, name }) => ({ modeId, name })),
      };
    },
    undo: async (figmaCtx, { id, name, modes }) => {
      const collection = await figmaCtx.variables.getVariableCollectionByIdAsync(id);
      if (collection === null) return undefined;
      if (collection.name !== name) collection.name = name;
      restoreModeNames(collection, modes);
      return undefined;
    },
  },
);
