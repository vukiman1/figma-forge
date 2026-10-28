export const fieldOf = (value: unknown, key: string): unknown =>
  typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined;

export const numberFieldOf = (value: unknown, key: string): number | undefined => {
  const field = fieldOf(value, key);
  return typeof field === 'number' ? field : undefined;
};

export const stringFieldOf = (value: unknown, key: string): string | undefined => {
  const field = fieldOf(value, key);
  return typeof field === 'string' ? field : undefined;
};
