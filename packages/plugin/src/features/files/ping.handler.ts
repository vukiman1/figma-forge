import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';

export const createPingHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  () => ({
    apiVersion: figmaCtx.apiVersion,
    editorType: figmaCtx.editorType,
    currentPageId: figmaCtx.currentPage.id,
    currentPageName: figmaCtx.currentPage.name,
    fileKey: figmaCtx.fileKey ?? null,
    ts: Date.now(),
  });
