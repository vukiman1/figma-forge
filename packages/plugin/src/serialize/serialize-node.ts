import { serializeNode as serializeBase, type SerializedNode } from '@figma-forge/core';

import { resolveMainComponent } from './main-component.js';
import { enrichWithMixins } from './node-fields/enrich-node.js';
import { applyRepeat, type RepeatFields } from './repeat-fields.js';

const INSTANCE_ID_PREFIX = 'I';
const INSTANCE_PATH_SEPARATOR = ';';

const toBase = (node: SceneNode, parent: BaseNode | null): SerializedNode =>
  serializeBase({
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
    locked: node.locked,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    parent: parent === null ? null : { id: parent.id },
  });

const mainNodeIdOf = (sublayerId: string): string =>
  sublayerId.slice(sublayerId.lastIndexOf(INSTANCE_PATH_SEPARATOR) + 1);

export const inheritRepeat = async (
  node: SceneNode,
  out: RepeatFields,
  lookup: (id: string) => Promise<BaseNode | null> = id => figma.getNodeByIdAsync(id),
): Promise<void> => {
  if (node.type !== 'TRANSFORM_GROUP' || out.transformModifiers !== undefined) return;
  if (!node.id.startsWith(INSTANCE_ID_PREFIX)) return;
  try {
    const source = await lookup(mainNodeIdOf(node.id));
    if (source?.type === 'TRANSFORM_GROUP') applyRepeat(node, source.transformModifiers, out);
  } catch {
    return;
  }
};

export const serializeFlatSync = (node: SceneNode): SerializedNode => {
  const parent = node.parent;
  return enrichWithMixins(node, toBase(node, parent), parent);
};

export const serializeFlat = async (node: SceneNode): Promise<SerializedNode> => {
  const out = serializeFlatSync(node);
  const mainComponent = await resolveMainComponent(node);
  if (mainComponent !== undefined) out.mainComponent = mainComponent;
  await inheritRepeat(node, out);
  return out;
};
