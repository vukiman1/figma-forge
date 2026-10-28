const INSTANCE_QUALIFIED = /^I([^;]+);/;

const walkFromInstanceRoot = async (
  figmaCtx: typeof figma,
  root: string,
  id: string,
): Promise<BaseNode | null> => {
  const instance = await figmaCtx.getNodeByIdAsync(root);
  if (instance === null || !('findOne' in instance)) return null;
  return instance.findOne(node => node.id === id);
};

const forwarding = (target: typeof figma, overrides: Partial<typeof figma>): typeof figma =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- an empty proxy target that forwards every member to the real Figma API
  new Proxy({} as typeof figma, {
    get: (_, prop) => {
      if (prop in overrides) return Reflect.get(overrides, prop);
      const value: unknown = Reflect.get(target, prop);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set: (_, prop, value) => Reflect.set(target, prop, value),
    has: (_, prop) => Reflect.has(target, prop),
  });

export const withInstanceIdLookup = (figmaCtx: typeof figma): typeof figma => {
  let hasByIdRejected = false;
  const getNodeByIdAsync = async (id: string): Promise<BaseNode | null> => {
    const root = INSTANCE_QUALIFIED.exec(id)?.[1];
    if (root === undefined) return figmaCtx.getNodeByIdAsync(id);
    if (hasByIdRejected) return walkFromInstanceRoot(figmaCtx, root, id);
    try {
      return await figmaCtx.getNodeByIdAsync(id);
    } catch {
      hasByIdRejected = true;
      return walkFromInstanceRoot(figmaCtx, root, id);
    }
  };
  return forwarding(figmaCtx, { getNodeByIdAsync });
};
