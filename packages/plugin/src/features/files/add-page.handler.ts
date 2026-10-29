import { ADD_PAGE_TOOL_NAME as TOOL, addPageParams, type CreateResult } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';

export const createAddPageHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  raw => {
    const { name } = parseParams(TOOL, addPageParams, raw);
    const page = figmaCtx.createPage();
    if (name !== undefined) page.name = name;
    const result: CreateResult = { ok: true, nodeId: page.id, name: page.name, type: page.type };
    return result;
  };
