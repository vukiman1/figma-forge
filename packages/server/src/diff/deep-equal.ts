const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const equalArrays = (left: readonly unknown[], right: readonly unknown[]): boolean =>
  left.length === right.length && left.every((value, index) => deepEqual(value, right[index]));

const equalObjects = (
  left: Readonly<Record<string, unknown>>,
  right: Readonly<Record<string, unknown>>,
): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(key => Object.hasOwn(right, key) && deepEqual(left[key], right[key]))
  );
};

export const deepEqual = (left: unknown, right: unknown): boolean => {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) return equalArrays(left, right);
  if (isPlainObject(left) && isPlainObject(right)) return equalObjects(left, right);
  return false;
};

export { isPlainObject };
