export const restorable = (value: unknown): boolean => typeof value !== 'symbol';

export const same = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a === 'symbol' || typeof b === 'symbol') return false;
  return JSON.stringify(a) === JSON.stringify(b);
};

export const readField = (node: unknown, key: string): unknown =>
  typeof node === 'object' && node !== null && key in node ? Reflect.get(node, key) : undefined;

export const writeIfDifferent = (node: object, key: string, value: unknown): void => {
  if (!(key in node) || !restorable(value) || same(Reflect.get(node, key), value)) return;
  Reflect.set(node, key, value);
};

export const pickFields = (node: object, keys: readonly string[]): Record<string, unknown> =>
  Object.fromEntries(keys.filter(key => key in node).map(key => [key, Reflect.get(node, key)]));

export const hasPattern = (paints: unknown): boolean =>
  Array.isArray(paints) && paints.some((paint: unknown) => readField(paint, 'type') === 'PATTERN');

export const nodeOrThrow = async (
  figmaCtx: typeof figma,
  id: string,
  what: string,
): Promise<BaseNode> => {
  const node = await figmaCtx.getNodeByIdAsync(id);
  if (node === null) throw new Error(`${what}: node ${id} no longer exists`);
  return node;
};

export const isInFlow = (node: SceneNode): boolean => {
  const mode = readField(readField(node, 'parent'), 'layoutMode');
  if (typeof mode !== 'string' || mode === 'NONE') return false;
  return readField(node, 'layoutPositioning') !== 'ABSOLUTE';
};
