import type { Affine } from './vector-fake.js';

export const container = (id: string, type: string, absolute: Affine, extra = {}) => {
  const node: Record<string, unknown> & { children: Record<string, unknown>[] } = {
    id,
    type,
    absoluteTransform: absolute,
    relativeTransform: absolute,
    children: [],
    parent: null,
    insertChild(index: number, child: Record<string, unknown>) {
      const old = child.parent as { children: unknown[] } | null;
      if (old) old.children.splice(old.children.indexOf(child), 1);
      node.children.splice(index, 0, child);
      child.parent = node;
    },
    ...extra,
  };
  return node;
};
export const add = (parent: ReturnType<typeof container>, child: Record<string, unknown>) => {
  parent.children.push(child);
  child.parent = parent;
  return child;
};

export const leaf = (id: string, rel: Affine, extra: Record<string, unknown> = {}) => {
  const node: Record<string, unknown> = { id, relativeTransform: rel, parent: null, ...extra };
  Object.defineProperty(node, 'absoluteTransform', {
    get: () => {
      const parent = node.parent as { type: string; parent: unknown; absoluteTransform: Affine };
      const space =
        parent.type === 'GROUP'
          ? (parent.parent as { absoluteTransform: Affine }).absoluteTransform
          : parent.absoluteTransform;
      const r = node.relativeTransform as Affine;
      return [
        [r[0][0], r[0][1], r[0][2] + space[0][2]],
        [r[1][0], r[1][1], r[1][2] + space[1][2]],
      ];
    },
  });
  return node;
};

export const painted = (
  id: string,
  rel: Affine,
  paint: [number, number, number, number],
  extra = {},
) => {
  const node = leaf(id, rel, extra);
  Object.defineProperty(node, 'absoluteRenderBounds', {
    get: () => {
      const t = node.absoluteTransform as Affine;
      return { x: t[0][2] + paint[0], y: t[1][2] + paint[1], width: paint[2], height: paint[3] };
    },
  });
  return node;
};
