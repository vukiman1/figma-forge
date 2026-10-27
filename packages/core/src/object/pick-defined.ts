type Defined<T> = T & ({} | null);

export type DefinedPick<S, K extends keyof S> = { [P in K]?: Defined<S[P]> };

export const pickDefined = <S extends object, K extends keyof S>(
  source: S,
  keys: readonly K[],
): DefinedPick<S, K> => {
  const picked: DefinedPick<S, K> = {};
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined) picked[key] = value;
  }
  return picked;
};
