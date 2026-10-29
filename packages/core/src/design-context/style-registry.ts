const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const HASH_RADIX = 36;

export interface StyleRegistry {
  readonly styles: Record<string, unknown>;
  register: (value: unknown, prefix: string) => string;
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const sortKeys = (_key: string, value: unknown): unknown => {
  if (!isPlainRecord(value)) return value;
  const keys = Object.keys(value).toSorted(byCodeUnit);
  return Object.fromEntries(keys.map(key => [key, value[key]]));
};

const stableStringify = (value: unknown): string => JSON.stringify(value, sortKeys);

const hashString = (text: string): string => {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return (hash >>> 0).toString(HASH_RADIX);
};

export const createStyleRegistry = (): StyleRegistry => {
  const styles: Record<string, unknown> = {};
  const idByValue = new Map<string, string>();

  const freeIdFor = (key: string, prefix: string): string => {
    const base = `${prefix}_${hashString(key)}`;
    let id = base;
    for (let n = 1; styles[id] !== undefined && stableStringify(styles[id]) !== key; n++) {
      id = `${base}_${n}`;
    }
    return id;
  };

  const register = (value: unknown, prefix: string): string => {
    const key = stableStringify(value);
    const known = idByValue.get(key);
    if (known !== undefined) return known;
    const id = freeIdFor(key, prefix);
    styles[id] = value;
    idByValue.set(key, id);
    return id;
  };

  return { styles, register };
};
