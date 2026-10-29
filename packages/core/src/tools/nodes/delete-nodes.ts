import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const DELETE_NODES_TOOL_NAME = 'delete_nodes';

export const deleteNodesParams = z.object({
  nodeIds: z.array(z.string()).describe('Node ids to delete'),
});

export const deleteNodesTool: ToolSpec = {
  name: DELETE_NODES_TOOL_NAME,
  description:
    'Permanently delete nodes by id; missing or non-removable nodes are skipped. To hide nodes ' +
    'reversibly instead of deleting them, use set_visible(false). Returns { ok, affected } — the ' +
    'ids actually removed.',
  inputSchema: deleteNodesParams,
  kind: 'write',
  destructive: true,
};
