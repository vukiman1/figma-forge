import type { SerializedBindings } from '@figma-forge/core';

const aliasIdOf = (alias: unknown): string | undefined => {
  if (typeof alias !== 'object' || alias === null || !('id' in alias)) return undefined;
  return typeof alias.id === 'string' ? alias.id : undefined;
};

export const collectBindings = (raw: unknown): SerializedBindings | undefined => {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const out: SerializedBindings = {};
  for (const [field, alias] of Object.entries(raw)) {
    const id = aliasIdOf(alias);
    if (id !== undefined) out[field] = id;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};
