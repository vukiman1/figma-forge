import type { EffectInput } from '@figma-forge/core';

import { boundIdsOf, resolveVariables, variableFor } from '../variables/resolve-variables.js';
import { toFigmaEffect } from './to-figma-effect.js';

export const toFigmaEffectsBound = async (
  figmaCtx: typeof figma,
  effects: readonly EffectInput[],
  where: string,
): Promise<Effect[]> => {
  const table = await resolveVariables(figmaCtx, boundIdsOf(effects), where);
  return effects.map(source =>
    Object.entries(source.boundVariables ?? {}).reduce(
      (effect, [field, id]) =>
        figmaCtx.variables.setBoundVariableForEffect(
          effect,
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Figma validates the field name and rejects unknown ones
          field as VariableBindableEffectField,
          variableFor(table, id),
        ),
      toFigmaEffect(source, figmaCtx),
    ),
  );
};
