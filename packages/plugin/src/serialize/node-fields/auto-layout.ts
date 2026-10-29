import type { SerializedNode } from '@figma-forge/core';

import { serializeAutoLayout } from '../auto-layout.js';

export const writeAutoLayout = (node: SceneNode, out: SerializedNode): void => {
  if (!('layoutMode' in node)) return;
  const mode = node.layoutMode;
  if (mode !== 'NONE') out.layout = serializeAutoLayout(node, mode);
};
