import type { GetMetadataResult } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { documentColorProfile } from '../color-space.js';

const DEFAULT_MODE = 'default';

export const createGetMetadataHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  () => {
    const { root, currentPage } = figmaCtx;
    const colorProfile = documentColorProfile(figmaCtx);
    const result: GetMetadataResult = {
      fileName: root.name,
      currentPage: { id: currentPage.id, name: currentPage.name },
      pages: root.children.map(page => ({ id: page.id, name: page.name })),
      editorType: figmaCtx.editorType,
      mode: figmaCtx.mode ?? DEFAULT_MODE,
      ...(colorProfile !== undefined && { colorProfile }),
    };
    return result;
  };
