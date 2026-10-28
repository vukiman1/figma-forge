import type { SerializedStyleIds } from '@figma-forge/core';

const STYLE_ID_KINDS = ['fill', 'stroke', 'effect', 'text'] as const;
const TRAILING_COMMAS = /,+$/;

export const cleanStyleIds = (ids: SerializedStyleIds): SerializedStyleIds => {
  const cleaned: SerializedStyleIds = {};
  for (const kind of STYLE_ID_KINDS) {
    const id = ids[kind];
    if (id !== undefined) cleaned[kind] = id.replace(TRAILING_COMMAS, '');
  }
  return cleaned;
};

export const styleIdValues = (ids: SerializedStyleIds): string[] =>
  STYLE_ID_KINDS.flatMap(kind => {
    const id = ids[kind];
    return id === undefined || id === '' ? [] : [id];
  });
