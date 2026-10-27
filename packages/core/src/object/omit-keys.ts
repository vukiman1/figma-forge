export const omitKeys = <T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): Omit<T, K> => {
  const copy = { ...source };
  for (const key of keys) delete copy[key];
  return copy;
};
