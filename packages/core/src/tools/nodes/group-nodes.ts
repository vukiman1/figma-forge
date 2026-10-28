import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const GROUP_NODES_TOOL_NAME = 'group_nodes';

export const groupNodesParams = z.object({
  nodeIds: z.array(z.string()).min(1).describe('Node ids to group'),
  name: z.string().optional().describe('Optional name for the new group'),
});

export const groupNodesTool: ToolSpec = {
  name: GROUP_NODES_TOOL_NAME,
  description:
    'Group nodes under their shared parent. nodeIds must be a non-empty list. ' +
    'Returns { ok, nodeId, name, type } for the new group.',
  inputSchema: groupNodesParams,
  kind: 'write',
};
