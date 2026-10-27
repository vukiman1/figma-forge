import type { GetMetadataResult } from '@figma-forge/core';

import type { SandboxToolHandler } from '../dispatcher.js';
import { documentColorProfile } from '../features/color-space.js';

export const createGetMetadataHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  () => {
    const root = figmaCtx.root;
    const result: GetMetadataResult = {
      fileName: root.name,
      currentPage: { id: figmaCtx.currentPage.id, name: figmaCtx.currentPage.name },
      pages: root.children.map(p => ({ id: p.id, name: p.name })),
      editorType: figmaCtx.editorType,
      mode: figmaCtx.mode ?? 'default',
    };
    const profile = documentColorProfile(figmaCtx);
    if (profile !== undefined) result.colorProfile = profile;
    return result;
  };
