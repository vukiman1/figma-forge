import type { DesignContextNode } from '@figma-forge/core';

import { nameVariableModes } from './name-variable-modes.js';
import { applyInheritedModes } from './root-variable-modes.js';
import { createCollectionCache } from './variable-collections.js';

export const resolveVariableModes = async (
  figmaCtx: typeof figma,
  roots: readonly SceneNode[],
  nodes: readonly DesignContextNode[],
): Promise<void> => {
  const cache = createCollectionCache(figmaCtx);
  await applyInheritedModes(cache, roots, nodes);
  await nameVariableModes(cache, nodes);
};
