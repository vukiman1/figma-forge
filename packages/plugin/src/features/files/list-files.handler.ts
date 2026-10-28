import type { ListFilesResult } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';

export const createListFilesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  () => {
    const { currentPage } = figmaCtx;
    const result: ListFilesResult = {
      files: [
        {
          fileKey: figmaCtx.fileKey ?? null,
          fileName: figmaCtx.root.name,
          currentPage: { id: currentPage.id, name: currentPage.name },
        },
      ],
    };
    return result;
  };
