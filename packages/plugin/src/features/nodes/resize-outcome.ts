import type { ResizeNodesResult } from '@figma-forge/core';

export interface Box {
  readonly width: number;
  readonly height: number;
}

export type Adjusted = NonNullable<ResizeNodesResult['adjusted']>[number];

type SizeBound = 'minWidth' | 'maxWidth' | 'minHeight' | 'maxHeight';

const FIGMA_MIN_SIZE = 0.01;

const BOUNDS: readonly (readonly [keyof Box, SizeBound])[] = [
  ['width', 'minWidth'],
  ['width', 'maxWidth'],
  ['height', 'minHeight'],
  ['height', 'maxHeight'],
];

export const sameSize = (a: number, b: number): boolean => Math.abs(a - b) < FIGMA_MIN_SIZE;

export const sameBox = (a: Box, b: Box): boolean =>
  sameSize(a.width, b.width) && sameSize(a.height, b.height);

const enclosingInstance = (node: BaseNode): InstanceNode | null => {
  for (let parent = node.parent; parent !== null; parent = parent.parent) {
    if (parent.type === 'INSTANCE') return parent;
  }
  return null;
};

const boundValue = (node: BaseNode, key: SizeBound): number | null => {
  const value: unknown = key in node ? Reflect.get(node, key) : null;
  return typeof value === 'number' ? value : null;
};

const heldBounds = (node: BaseNode, requested: Box, after: Box): string[] =>
  BOUNDS.flatMap(([axis, key]) => {
    const value = boundValue(node, key);
    const held =
      value !== null && !sameSize(after[axis], requested[axis]) && sameSize(after[axis], value);
    return held ? [`${key} ${value}`] : [];
  });

const instanceKept = (instance: InstanceNode): string =>
  `it sits inside instance ${instance.id} ("${instance.name}"), which kept the size its main ` +
  'component gives it and ignored the resize — resize the instance itself, change this layer in ' +
  'the main component, or detach_instance first';

export const explainMiss = (node: BaseNode, requested: Box, before: Box, after: Box): string => {
  const instance = enclosingInstance(node);
  if (node.type === 'LINE' && instance === null && sameSize(after.width, requested.width)) {
    return `a line has no height — it was set to length ${after.width} and keeps height 0`;
  }
  if (instance !== null && sameBox(after, before)) return instanceKept(instance);
  const held = heldBounds(node, requested, after);
  if (held.length > 0) {
    return `held by ${held.join(' and ')} — clear or change the bound with set_layout_props first`;
  }
  return `Figma sized it to ${after.width} × ${after.height} instead`;
};
