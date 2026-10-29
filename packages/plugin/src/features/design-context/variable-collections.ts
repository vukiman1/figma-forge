export interface CollectionCache {
  readonly load: (id: string) => Promise<VariableCollection | null>;
  readonly loaded: (id: string) => VariableCollection | null;
  readonly isStale: (collectionId: string, modeId: string) => boolean;
}

const fetchOrNull = async (
  figmaCtx: typeof figma,
  id: string,
): Promise<VariableCollection | null> => {
  if (typeof figmaCtx.variables?.getVariableCollectionByIdAsync !== 'function') return null;
  try {
    return await figmaCtx.variables.getVariableCollectionByIdAsync(id);
  } catch {
    return null;
  }
};

export const createCollectionCache = (figmaCtx: typeof figma): CollectionCache => {
  const collections = new Map<string, VariableCollection | null>();
  const loaded = (id: string): VariableCollection | null => collections.get(id) ?? null;
  return {
    loaded,
    load: async id => {
      if (!collections.has(id)) collections.set(id, await fetchOrNull(figmaCtx, id));
      return loaded(id);
    },
    isStale: (collectionId, modeId) => {
      const collection = loaded(collectionId);
      return collection !== null && !collection.modes.some(mode => mode.modeId === modeId);
    },
  };
};
