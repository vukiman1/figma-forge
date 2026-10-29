import type { SerializedNode, SerializedStyleIds } from '@figma-forge/core';

import { explicitModesOf } from './variable-modes.js';

const STYLE_ID_FIELDS = [
  ['fill', 'fillStyleId'],
  ['stroke', 'strokeStyleId'],
  ['effect', 'effectStyleId'],
  ['text', 'textStyleId'],
] as const satisfies readonly (readonly [keyof SerializedStyleIds, string])[];

const aliasIds = (value: unknown): string[] => {
  const aliases: readonly unknown[] = Array.isArray(value) ? value : [value];
  return aliases
    .filter(
      (alias): alias is { id: string } =>
        typeof alias === 'object' && alias !== null && 'id' in alias,
    )
    .map(alias => alias.id);
};

export const collectBoundVariables = (raw: unknown): Record<string, string[]> | undefined => {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const result: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(raw)) {
    const ids = aliasIds(value);
    if (ids.length > 0) result[field] = ids;
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

const collectStyleIds = (node: SceneNode): SerializedStyleIds => {
  const styleIds: SerializedStyleIds = {};
  for (const [slot, key] of STYLE_ID_FIELDS) {
    const value: unknown = Reflect.get(node, key);
    if (typeof value === 'string' && value !== '') styleIds[slot] = value;
  }
  return styleIds;
};

export const collectStyleLinks = (node: SceneNode, out: SerializedNode): void => {
  const styleIds = collectStyleIds(node);
  if (Object.keys(styleIds).length > 0) out.styleIds = styleIds;
  const bound = collectBoundVariables(Reflect.get(node, 'boundVariables'));
  if (bound !== undefined) out.boundVariables = bound;
  const modes = explicitModesOf(node);
  if (modes !== undefined) out.explicitVariableModes = modes;
};
