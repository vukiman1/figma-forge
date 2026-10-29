import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const ADD_PAGE_TOOL_NAME = 'add_page';

export const addPageParams = z.object({
  name: z.string().optional().describe('Optional page name'),
});

export const addPageTool: ToolSpec = {
  name: ADD_PAGE_TOOL_NAME,
  description: 'Create a new page (optionally named). Returns { ok, nodeId, name, type }.',
  inputSchema: addPageParams,
  kind: 'write',
};
