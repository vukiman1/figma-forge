import { MIXED } from './batch-fake.js';

export type TreeNode = Record<string, unknown> & {
  id: string;
  children?: TreeNode[];
  parent?: TreeNode | null;
};

export const T0 = [
  [1, 0, 0],
  [0, 1, 0],
];

export const makeTree = () => {
  const store = new Map<string, TreeNode>();
  let seq = 0;
  const detach = (child: TreeNode): void => {
    const parent = child.parent;
    if (parent === null || parent === undefined) return;
    parent.children!.splice(parent.children!.indexOf(child), 1);
    if (parent.type === 'COMPONENT_SET')
      child.name = `Component/${String(child.name).split('=')[1]}`;
    if (
      (parent.type === 'GROUP' ||
        parent.type === 'TRANSFORM_GROUP' ||
        parent.type === 'COMPONENT_SET') &&
      parent.children!.length === 0
    ) {
      parent.removed = true;
      detach(parent);
      store.delete(parent.id);
    }
  };
  const place = (parent: TreeNode, child: TreeNode, index: number): void => {
    detach(child);
    parent.children!.splice(Math.min(index, parent.children!.length), 0, child);
    child.parent = parent;
    if (typeof parent.layoutMode === 'string' && parent.layoutMode !== 'NONE') {
      child.relativeTransform = T0;
    }
  };
  const node = (
    id: string,
    type: string,
    parent: TreeNode | null,
    extra: Record<string, unknown> = {},
  ): TreeNode => {
    const n: TreeNode = {
      id,
      type,
      name: id,
      parent: null,
      width: 10,
      height: 10,
      relativeTransform: T0,
      removed: false,
      resizeWithoutConstraints(this: TreeNode, w: number, h: number) {
        this.width = w;
        this.height = h;
      },
      remove(this: TreeNode) {
        detach(this);
        this.removed = true;
        store.delete(this.id);
      },
      ...extra,
    };
    if (['FRAME', 'GROUP', 'TRANSFORM_GROUP', 'PAGE', 'COMPONENT_SET'].includes(type)) {
      n.children = [];
      n.layoutMode ??= 'NONE';
      n.insertChild = (i: number, c: TreeNode) => place(n, c, i);
      n.appendChild = (c: TreeNode) => place(n, c, n.children!.length);
    }
    store.set(id, n);
    if (parent !== null) place(parent, n, parent.children!.length);
    return n;
  };
  const figmaCtx = {
    mixed: MIXED,
    root: { children: [] },
    getNodeByIdAsync: async (id: string) => store.get(id) ?? null,
    variables: { getVariableByIdAsync: async (id: string) => ({ id }) },
    group: (nodes: TreeNode[], parent: TreeNode) => {
      const g = node(`G:${(seq += 1)}`, 'GROUP', parent);
      for (const n of nodes) place(g, n, g.children!.length);
      return g;
    },
    transformGroup: (nodes: TreeNode[], parent: TreeNode, index: number, modifiers: unknown) => {
      const g = node(`R:${(seq += 1)}`, 'TRANSFORM_GROUP', null, { transformModifiers: modifiers });
      place(parent, g, index);
      for (const n of nodes) place(g, n, g.children!.length);
      return g;
    },
    combineAsVariants: (components: TreeNode[], parent: TreeNode) => {
      const set = node(`S:${(seq += 1)}`, 'COMPONENT_SET', parent);
      const shared: Record<string, unknown> = Object.fromEntries(
        components.flatMap(c => {
          const definitions = c.componentPropertyDefinitions;
          return typeof definitions === 'object' && definitions !== null
            ? Object.entries(definitions)
            : [];
        }),
      );
      for (const c of components) {
        place(set, c, set.children!.length);
        c.name = `Property 1=${String(c.name)}`;
        c.componentPropertyDefinitions = { ...shared };
      }
      return set;
    },
  } as unknown as typeof figma;
  return { store, node, figmaCtx };
};

export const ids = (n: TreeNode): string[] => n.children!.map(c => c.id);
