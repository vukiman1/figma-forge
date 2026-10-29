import {
  DELETE_PAGE_TOOL_NAME as TOOL,
  deletePageParams,
  type MutateResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requirePage } from './require-page.js';

const requireRemovable = (figmaCtx: typeof figma, page: PageNode): void => {
  if (page.id === figmaCtx.currentPage.id) {
    throw new Error(`${TOOL}: cannot delete the current page`);
  }
  if (figmaCtx.root.children.length <= 1) {
    throw new Error(`${TOOL}: cannot delete the last remaining page`);
  }
};

export const createDeletePageHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { pageId } = parseParams(TOOL, deletePageParams, raw);
    const page = await requirePage(figmaCtx, TOOL, pageId);
    requireRemovable(figmaCtx, page);
    page.remove();
    const result: MutateResult = { ok: true, nodeId: pageId };
    return result;
  };
