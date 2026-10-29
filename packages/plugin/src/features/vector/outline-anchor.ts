import { isSceneNode } from '../nodes/scene-node.js';

const CONTAINERS_REFUSING_OUTLINE: ReadonlySet<string> = new Set([
  'INSTANCE',
  'BOOLEAN_OPERATION',
  'TRANSFORM_GROUP',
]);

const isLaidOut = (node: SceneNode): boolean => {
  const parent = node.parent;
  if (parent === null || !('layoutMode' in parent) || parent.layoutMode === 'NONE') return false;
  return !('layoutPositioning' in node) || node.layoutPositioning !== 'ABSOLUTE';
};

const outermostRefusingContainer = (source: SceneNode): SceneNode => {
  let anchor = source;
  for (let up = source.parent; isSceneNode(up); up = up.parent) {
    if (CONTAINERS_REFUSING_OUTLINE.has(up.type)) anchor = up;
  }
  return anchor;
};

const outermostGroupAbove = (node: SceneNode): GroupNode | null => {
  let group: GroupNode | null = null;
  for (let up = node.parent; up?.type === 'GROUP'; up = up.parent) group = up;
  return group;
};

export const outlineAnchor = (source: SceneNode): SceneNode => {
  const anchor = outermostRefusingContainer(source);
  const group = outermostGroupAbove(anchor);
  return group !== null && isLaidOut(group) ? group : anchor;
};
