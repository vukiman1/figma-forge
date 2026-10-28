import { GET_DOCUMENT_TOOL_NAME as TOOL, type GetDocumentResult } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { resultCharBudget, serializeTrees, treeTooLargeError } from '../../serializer.js';

export const createGetDocumentHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async () => {
    const page = figmaCtx.currentPage;
    const run = await serializeTrees(page.children, resultCharBudget());
    if (!run.complete) throw treeTooLargeError(TOOL, run.total, 'page');
    const result: GetDocumentResult = {
      pageId: page.id,
      pageName: page.name,
      children: run.nodes,
    };
    return result;
  };
