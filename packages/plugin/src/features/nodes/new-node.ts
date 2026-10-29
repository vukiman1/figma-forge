import type { CreateResult } from '@figma-forge/core';

interface Placement {
  readonly name?: string | undefined;
  readonly x?: number | undefined;
  readonly y?: number | undefined;
}

interface Size {
  readonly width?: number | undefined;
  readonly height?: number | undefined;
}

export const isSized = <S extends Size>(size: S): size is S & { width: number; height: number } =>
  size.width !== undefined && size.height !== undefined;

export const setNameAndPosition = (node: SceneNode, { name, x, y }: Placement): void => {
  if (name !== undefined) node.name = name;
  if (x !== undefined) node.x = x;
  if (y !== undefined) node.y = y;
};

export const createdResult = (node: SceneNode): CreateResult => ({
  ok: true,
  nodeId: node.id,
  name: node.name,
  type: node.type,
});
