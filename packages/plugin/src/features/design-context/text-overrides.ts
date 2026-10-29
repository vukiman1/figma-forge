import { childrenOf } from './child-nodes.js';

export interface TextOverride {
  readonly name: string;
  readonly characters: string;
}

const textOf = (node: SceneNode): TextOverride[] => {
  if (!node.visible) return [];
  if (node.type === 'TEXT' || node.type === 'TEXT_PATH') {
    return node.characters === '' ? [] : [{ name: node.name, characters: node.characters }];
  }
  return childrenOf(node).flatMap(textOf);
};

export const collectTextOverrides = (instance: SceneNode): TextOverride[] =>
  childrenOf(instance).flatMap(textOf);
