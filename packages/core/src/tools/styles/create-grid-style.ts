import { z } from 'zod';

import { gridItemSchema } from '../shared/grid-schema.js';
import type { ToolSpec } from '../tool-spec.js';

export const CREATE_GRID_STYLE_TOOL_NAME = 'create_grid_style';

export const createGridStyleParams = z.object({
  name: z.string().describe('Style name, e.g. "Layout/8pt"'),
  grids: z.array(gridItemSchema),
  description: z.string().optional(),
});

export const createGridStyleTool: ToolSpec = {
  name: CREATE_GRID_STYLE_TOOL_NAME,
  description:
    'Create a reusable local layout-grid style for aligning content. Each grid pattern is GRID ' +
    '(uniform squares via sectionSize) or ROWS / COLUMNS (count + gutterSize + alignment). Apply it ' +
    'to frames with apply_style_to_node. Returns { ok, styleId, name }.',
  inputSchema: createGridStyleParams,
  kind: 'write',
};
