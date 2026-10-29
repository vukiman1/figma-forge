import type { ListFilesResult } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';

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
