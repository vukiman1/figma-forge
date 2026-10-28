import {
  type MutateResult,
  RENAME_PAGE_TOOL_NAME as TOOL,
  renamePageParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { requirePage } from './require-page.js';

export const createRenamePageHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { pageId, name } = parseParams(TOOL, renamePageParams, raw);
    const page = await requirePage(figmaCtx, TOOL, pageId);
    page.name = name;
    const result: MutateResult = { ok: true, nodeId: page.id };
    return result;
  };
