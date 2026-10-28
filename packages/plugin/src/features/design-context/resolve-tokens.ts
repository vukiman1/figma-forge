import type { DesignContextNode, GetDesignContextResult, ResolvedToken } from '@figma-forge/core';

import { serializeCodeSyntax } from '../../serializer.js';
import { collectRefs } from './collect-refs.js';

type TokenMaps = Pick<GetDesignContextResult, 'variables' | 'styles'>;
type Resolver = (id: string) => Promise<ResolvedToken | null>;

const resolveOrNull = async (resolve: Resolver, id: string): Promise<ResolvedToken | null> => {
  try {
    return await resolve(id);
  } catch {
    return null;
  }
};

const resolveAll = async (
  ids: ReadonlySet<string>,
  resolve: Resolver,
): Promise<Record<string, ResolvedToken> | null> => {
  const entries = await Promise.all(
    [...ids].map(async id => [id, await resolveOrNull(resolve, id)] as const),
  );
  const resolved = entries.flatMap(([id, token]) => (token === null ? [] : [[id, token] as const]));
  return resolved.length > 0 ? Object.fromEntries(resolved) : null;
};

const variableResolver =
  (figmaCtx: typeof figma): Resolver =>
  async id => {
    const variable = await figmaCtx.variables.getVariableByIdAsync(id);
    if (variable === null) return null;
    const codeSyntax = serializeCodeSyntax(variable.codeSyntax);
    return {
      name: variable.name,
      type: variable.resolvedType,
      ...(codeSyntax !== undefined && { codeSyntax }),
    };
  };

const styleResolver =
  (figmaCtx: typeof figma): Resolver =>
  async id => {
    const style = await figmaCtx.getStyleByIdAsync(id);
    return style === null ? null : { name: style.name, type: style.type };
  };

const canResolveVariables = (figmaCtx: typeof figma): boolean =>
  typeof figmaCtx.variables?.getVariableByIdAsync === 'function';

const canResolveStyles = (figmaCtx: typeof figma): boolean =>
  typeof figmaCtx.getStyleByIdAsync === 'function';

export const resolveTokens = async (
  figmaCtx: typeof figma,
  nodes: readonly DesignContextNode[],
): Promise<TokenMaps> => {
  const { variableIds, styleIds } = collectRefs(nodes);
  const variables =
    variableIds.size > 0 && canResolveVariables(figmaCtx)
      ? await resolveAll(variableIds, variableResolver(figmaCtx))
      : null;
  const styles =
    styleIds.size > 0 && canResolveStyles(figmaCtx)
      ? await resolveAll(styleIds, styleResolver(figmaCtx))
      : null;
  return { ...(variables !== null && { variables }), ...(styles !== null && { styles }) };
};
