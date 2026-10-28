export const dropDefaults = <T extends object>(
  values: T,
  defaults: Partial<Record<keyof T, unknown>>,
): Partial<T> => {
  const kept: Partial<T> = { ...values };
  for (const key in defaults) {
    if (kept[key] === defaults[key]) delete kept[key];
  }
  return kept;
};
