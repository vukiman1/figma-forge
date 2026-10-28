import type { GetPagesResult } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';

export const createGetPagesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  () => {
    const result: GetPagesResult = {
      pages: figmaCtx.root.children.map(page => ({
        id: page.id,
        name: page.name,
        flows: page.flowStartingPoints.map(({ nodeId, name }) => ({ nodeId, name })),
      })),
    };
    return result;
  };
