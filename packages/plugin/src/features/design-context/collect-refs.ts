import type { DesignContextNode, SerializedStyleIds } from '@figma-forge/core';

import { styleIdValues } from './style-ids.js';

export interface TokenRefs {
  readonly variableIds: ReadonlySet<string>;
  readonly styleIds: ReadonlySet<string>;
}

interface BindingBearer {
  readonly boundVariables?: Readonly<Record<string, readonly string[]>> | undefined;
  readonly styleIds?: SerializedStyleIds | undefined;
}

const bearersOf = (node: DesignContextNode): BindingBearer[] => [
  node,
  ...(node.segments ?? []),
  ...(node.children ?? []).flatMap(bearersOf),
];

export const collectRefs = (nodes: readonly DesignContextNode[]): TokenRefs => {
  const bearers = nodes.flatMap(bearersOf);
  return {
    variableIds: new Set(
      bearers.flatMap(({ boundVariables }) => Object.values(boundVariables ?? {}).flat()),
    ),
    styleIds: new Set(
      bearers.flatMap(({ styleIds }) => (styleIds === undefined ? [] : styleIdValues(styleIds))),
    ),
  };
};
