export const isSceneNode = (node: BaseNode | null): node is SceneNode =>
  node !== null && node.type !== 'PAGE' && node.type !== 'DOCUMENT';
