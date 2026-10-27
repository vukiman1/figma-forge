import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const DELETE_STYLE_TOOL_NAME = 'delete_style';

export const deleteStyleParams = z.object({
  styleId: z.string().describe('Style id to delete'),
});

export const deleteStyleTool: ToolSpec = {
  name: DELETE_STYLE_TOOL_NAME,
  description:
    'Delete a local style (paint / text / effect / grid) by id. Returns { ok, styleId, name }.',
  inputSchema: deleteStyleParams,
  kind: 'write',
  destructive: true,
};
