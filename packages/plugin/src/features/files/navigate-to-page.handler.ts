import {
  type MutateResult,
  NAVIGATE_TO_PAGE_TOOL_NAME as TOOL,
  navigateToPageParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requirePage } from './require-page.js';

export const createNavigateToPageHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { pageId } = parseParams(TOOL, navigateToPageParams, raw);
    const page = await requirePage(figmaCtx, TOOL, pageId);
    await figmaCtx.setCurrentPageAsync(page);
    const result: MutateResult = { ok: true, nodeId: page.id };
    return result;
  };
