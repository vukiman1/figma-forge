import type { DesignContextNode, GetDesignContextResult } from '@figma-forge/core';

import { isPlainObject } from './deep-equal.js';
import type { FlatDesignNode } from './design-diff-types.js';

const REFERENCE_FIELDS = new Set(['fill', 'stroke', 'effect', 'textStyle']);

const resolveTokenRecord = (
  value: Readonly<Record<string, unknown>>,
  tokenName: (id: string) => string,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(value).map(([key, tokenId]) => [
      key,
      typeof tokenId === 'string' ? tokenName(tokenId) : tokenId,
    ]),
  );

const resolveTokenLists = (
  value: Readonly<Record<string, unknown>>,
  tokenName: (id: string) => string,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(value).map(([key, tokenIds]) => [
      key,
      Array.isArray(tokenIds)
        ? tokenIds.map(tokenId => (typeof tokenId === 'string' ? tokenName(tokenId) : tokenId))
        : tokenIds,
    ]),
  );

const resolveField = (
  key: string,
  value: unknown,
  globalVars: Readonly<Record<string, unknown>>,
  tokenName: (id: string) => string,
): unknown => {
  if (REFERENCE_FIELDS.has(key) && typeof value === 'string') {
    return Object.hasOwn(globalVars, value) ? globalVars[value] : value;
  }
  if (key === 'styleIds' && isPlainObject(value)) return resolveTokenRecord(value, tokenName);
  if (key === 'boundVariables' && isPlainObject(value)) return resolveTokenLists(value, tokenName);
  return value;
};

const resolveOwnFields = (
  node: DesignContextNode,
  globalVars: Readonly<Record<string, unknown>>,
  tokenName: (id: string) => string,
): Record<string, unknown> => {
  const own: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key !== 'children') own[key] = resolveField(key, value, globalVars, tokenName);
  }
  return own;
};

interface FlattenContext {
  output: Map<string, FlatDesignNode>;
  globalVars: Readonly<Record<string, unknown>>;
  tokenName: (id: string) => string;
}

const visitNode = (
  node: DesignContextNode,
  parentId: string | null,
  index: number,
  ancestry: readonly string[],
  context: FlattenContext,
): void => {
  const path = [...ancestry, node.name].join(' / ');
  if (!context.output.has(node.id)) {
    context.output.set(node.id, {
      own: resolveOwnFields(node, context.globalVars, context.tokenName),
      name: node.name,
      type: node.type,
      path,
      parentId,
      index,
    });
  }
  for (const [childIndex, child] of (node.children ?? []).entries()) {
    visitNode(child, node.id, childIndex, [...ancestry, node.name], context);
  }
};

export const flattenDesignContext = (
  result: GetDesignContextResult,
): Map<string, FlatDesignNode> => {
  const context: FlattenContext = {
    output: new Map(),
    globalVars: result.globalVars?.styles ?? {},
    tokenName: (id: string): string =>
      result.variables?.[id]?.name ?? result.styles?.[id]?.name ?? id,
  };
  for (const [index, node] of result.nodes.entries()) visitNode(node, null, index, [], context);
  return context.output;
};
