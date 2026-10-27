import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const GET_NODES_INFO_TOOL_NAME = 'get_nodes_info';

export const getNodesInfoParams = z.object({
  nodeIds: z.array(z.string()).describe('Figma node ids to fetch'),
});

export const getNodesInfoTool: ToolSpec = {
  name: GET_NODES_INFO_TOOL_NAME,
  description:
    'Return multiple Figma nodes by id. Output preserves input order; missing ids slot null.',
  inputSchema: getNodesInfoParams,
  kind: 'read',
};
