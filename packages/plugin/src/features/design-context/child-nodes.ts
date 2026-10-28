export const childrenOf = (node: SceneNode): readonly SceneNode[] =>
  'children' in node ? node.children : [];
