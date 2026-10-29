import type { GetVariableDefsResult } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { serializeCodeSyntax } from '../../serialize/code-syntax.js';
import { displayP3Marker } from '../color-space.js';
import { serializeVariableValue } from './serialize-variable-value.js';

type SerializedVariable = GetVariableDefsResult['variables'][number];

const isUnscoped = (scopes: readonly VariableScope[]): boolean =>
  scopes.length === 1 && scopes[0] === 'ALL_SCOPES';

const serializeCollection = (collection: VariableCollection) => ({
  id: collection.id,
  name: collection.name,
  key: collection.key,
  defaultModeId: collection.defaultModeId,
  modes: collection.modes.map(mode => ({ modeId: mode.modeId, name: mode.name })),
  variableIds: [...collection.variableIds],
});

const serializeVariable = (variable: Variable): SerializedVariable => {
  const codeSyntax = serializeCodeSyntax(variable.codeSyntax);
  return {
    id: variable.id,
    name: variable.name,
    key: variable.key,
    resolvedType: variable.resolvedType,
    collectionId: variable.variableCollectionId,
    valuesByMode: Object.fromEntries(
      Object.entries(variable.valuesByMode).map(([modeId, value]) => [
        modeId,
        serializeVariableValue(value),
      ]),
    ),
    ...(codeSyntax === undefined ? {} : { codeSyntax }),
    ...(isUnscoped(variable.scopes) ? {} : { scopes: [...variable.scopes] }),
  };
};

export const createGetVariableDefsHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async () => {
    const [collections, variables] = await Promise.all([
      figmaCtx.variables.getLocalVariableCollectionsAsync(),
      figmaCtx.variables.getLocalVariablesAsync(),
    ]);
    const result: GetVariableDefsResult = {
      ...displayP3Marker(figmaCtx),
      collections: collections.map(serializeCollection),
      variables: variables.map(serializeVariable),
    };
    return result;
  };
