import type { DesignContextNode } from '@figma-forge/core';

import type { PropertyOverride } from './property-overrides.js';
import type { CollectionCache } from './variable-collections.js';

interface ModeCarrier {
  variableModes?: Readonly<Record<string, string>> | undefined;
}

interface Carriers {
  readonly nodes: ModeCarrier[];
  readonly overrides: ModeCarrier[];
}

const collectCarriers = (node: DesignContextNode, into: Carriers): void => {
  if (node.variableModes !== undefined) into.nodes.push(node);
  const overrides: readonly PropertyOverride[] = node.propertyOverrides ?? [];
  into.overrides.push(...overrides.filter(override => override.variableModes !== undefined));
  for (const child of node.children ?? []) collectCarriers(child, into);
};

const collectionLabeler = (
  cache: CollectionCache,
  ids: ReadonlySet<string>,
): ((id: string) => string) => {
  const nameCounts = new Map<string, number>();
  for (const id of ids) {
    const name = cache.loaded(id)?.name;
    if (name !== undefined) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  return id => {
    const name = cache.loaded(id)?.name;
    if (name === undefined) return id;
    return (nameCounts.get(name) ?? 0) > 1 ? `${name} (${id})` : name;
  };
};

const modeName = (cache: CollectionCache, collectionId: string, modeId: string): string =>
  cache.loaded(collectionId)?.modes.find(mode => mode.modeId === modeId)?.name ?? modeId;

const namedModes = (
  cache: CollectionCache,
  label: (id: string) => string,
  modes: Readonly<Record<string, string>>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(modes)
      .filter(([collectionId, modeId]) => !cache.isStale(collectionId, modeId))
      .map(([collectionId, modeId]) => [
        label(collectionId),
        modeName(cache, collectionId, modeId),
      ]),
  );

export const nameVariableModes = async (
  cache: CollectionCache,
  nodes: readonly DesignContextNode[],
): Promise<void> => {
  const carriers: Carriers = { nodes: [], overrides: [] };
  for (const node of nodes) collectCarriers(node, carriers);
  const all = [...carriers.nodes, ...carriers.overrides];
  const ids = new Set(all.flatMap(carrier => Object.keys(carrier.variableModes ?? {})));
  if (all.length === 0) return;
  await Promise.all([...ids].map(cache.load));
  const label = collectionLabeler(cache, ids);
  for (const override of carriers.overrides) {
    override.variableModes = namedModes(cache, label, override.variableModes ?? {});
  }
  for (const node of carriers.nodes) {
    const named = namedModes(cache, label, node.variableModes ?? {});
    if (Object.keys(named).length > 0) node.variableModes = named;
    else delete node.variableModes;
  }
};
