import type { DesignContextNode } from '@figma-forge/core';

import type { CollectionCache } from './variable-collections.js';

type Modes = Readonly<Record<string, string>>;

const inheritedModesOf = (root: SceneNode): Modes | null => {
  if (!('resolvedVariableModes' in root)) return null;
  const resolved: unknown = root.resolvedVariableModes;
  if (typeof resolved !== 'object' || resolved === null) return null;
  return Object.fromEntries(
    Object.entries(resolved).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
};

const liveOwnModes = (cache: CollectionCache, own: Modes): Record<string, string> =>
  Object.fromEntries(
    Object.entries(own).filter(([collectionId, modeId]) => !cache.isStale(collectionId, modeId)),
  );

const nonDefaultInherited = (
  cache: CollectionCache,
  inherited: Modes,
  own: Modes,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(inherited).filter(([collectionId, modeId]) => {
      const collection = cache.loaded(collectionId);
      return !(collectionId in own) && collection !== null && modeId !== collection.defaultModeId;
    }),
  );

const applyRootModes = async (
  cache: CollectionCache,
  root: SceneNode,
  node: DesignContextNode,
): Promise<void> => {
  const inherited = inheritedModesOf(root);
  if (inherited === null) return;
  const declared = node.variableModes ?? {};
  await Promise.all([...Object.keys(declared), ...Object.keys(inherited)].map(cache.load));
  const own = liveOwnModes(cache, declared);
  const modes = { ...nonDefaultInherited(cache, inherited, own), ...own };
  if (Object.keys(modes).length > 0) node.variableModes = modes;
  else delete node.variableModes;
};

export const applyInheritedModes = async (
  cache: CollectionCache,
  roots: readonly SceneNode[],
  nodes: readonly DesignContextNode[],
): Promise<void> => {
  await Promise.all(
    roots.map(async (root, index) => {
      const node = nodes[index];
      if (node !== undefined) await applyRootModes(cache, root, node);
    }),
  );
};
