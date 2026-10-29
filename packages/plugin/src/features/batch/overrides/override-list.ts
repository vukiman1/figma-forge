export interface Override {
  readonly id: string;
  readonly fields: readonly string[];
}

export type PropertyValue = string | boolean | VariableAlias;

const byId = (a: Override, b: Override): number => a.id.localeCompare(b.id);

export const normalizeOverrides = (
  list: readonly { id: string; overriddenFields: readonly string[] }[],
): Override[] =>
  list
    .map(override => ({ id: override.id, fields: [...override.overriddenFields].toSorted() }))
    .toSorted(byId);

const pairsOf = (list: readonly Override[]): Set<string> =>
  new Set(list.flatMap(override => override.fields.map(field => `${override.id}.${field}`)));

export const describeOverrideDiff = (
  now: readonly Override[],
  was: readonly Override[],
): string => {
  const [current, before] = [pairsOf(now), pairsOf(was)];
  const added = [...current].filter(pair => !before.has(pair));
  const lost = [...before].filter(pair => !current.has(pair));
  return [
    added.length > 0 ? `+${added.join(' +')}` : '',
    lost.length > 0 ? `-${lost.join(' -')}` : '',
  ]
    .filter(Boolean)
    .join(' ');
};

export const instanceChain = (node: BaseNode): InstanceNode[] => {
  const chain: InstanceNode[] = [];
  for (let current: BaseNode | null = node; current !== null; current = current.parent ?? null) {
    if (current.type === 'INSTANCE') chain.push(current);
  }
  return chain;
};

export const propertyValues = (instance: InstanceNode): Record<string, PropertyValue> =>
  Object.fromEntries(
    Object.entries(instance.componentProperties).map(([key, property]) => [
      key,
      property.boundVariables?.value ?? property.value,
    ]),
  );
