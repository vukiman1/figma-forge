import type { GetStylesResult, ResolvedToken, SerializedBindings } from '@figma-forge/core';

import { serializeCodeSyntax } from '../../serializer.js';

const idsOf = (bindings: SerializedBindings | undefined): string[] =>
  bindings === undefined ? [] : Object.values(bindings);

export const boundVariableIds = (result: GetStylesResult): Set<string> =>
  new Set([
    ...result.paints.flatMap(style =>
      style.paints.flatMap(paint => {
        if (paint.type === 'SOLID') return idsOf(paint.boundVariables);
        return 'gradientStops' in paint
          ? paint.gradientStops.flatMap(stop => idsOf(stop.boundVariables))
          : [];
      }),
    ),
    ...result.texts.flatMap(style => idsOf(style.boundVariables)),
    ...result.effects.flatMap(style =>
      style.effects.flatMap(effect => idsOf(effect.boundVariables)),
    ),
    ...result.grids.flatMap(style => style.grids.flatMap(grid => idsOf(grid.boundVariables))),
  ]);

const toToken = (variable: Variable): ResolvedToken => {
  const codeSyntax = serializeCodeSyntax(variable.codeSyntax);
  return {
    name: variable.name,
    type: variable.resolvedType,
    ...(codeSyntax === undefined ? {} : { codeSyntax }),
  };
};

const readableToken = async (
  figmaCtx: typeof figma,
  id: string,
): Promise<[string, ResolvedToken] | null> => {
  const variable = await figmaCtx.variables.getVariableByIdAsync(id).catch(() => null);
  return variable === null ? null : [id, toToken(variable)];
};

export const resolveStyleVariables = async (
  figmaCtx: typeof figma,
  ids: ReadonlySet<string>,
): Promise<Record<string, ResolvedToken> | undefined> => {
  if (ids.size === 0 || typeof figmaCtx.variables?.getVariableByIdAsync !== 'function') {
    return undefined;
  }
  const entries = await Promise.all([...ids].map(async id => readableToken(figmaCtx, id)));
  const tokens = entries.filter(entry => entry !== null);
  return tokens.length > 0 ? Object.fromEntries(tokens) : undefined;
};
