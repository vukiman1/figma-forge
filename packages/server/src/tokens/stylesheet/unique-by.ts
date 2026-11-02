export interface NameValue {
  readonly name: string;
  readonly value: string;
}

export const nameValueKey = (entry: NameValue): string => `${entry.name}\u0000${entry.value}`;

export const uniqueBy = <T>(items: readonly T[], keyOf: (item: T) => string): T[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
