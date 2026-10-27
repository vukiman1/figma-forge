import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const UNGROUP_NODES_TOOL_NAME = 'ungroup_nodes';

export const ungroupNodesParams = z.object({
  nodeIds: z.array(z.string()).describe('Group node ids to ungroup'),
});

export const ungroupNodesTool: ToolSpec = {
  name: UNGROUP_NODES_TOOL_NAME,
  description:
    'Ungroup GROUP nodes by id — and repeat groups (TRANSFORM_GROUP, from repeat_nodes or Figma ' +
    'Draw), which drops the repeat and leaves the original content in place; other nodes are ' +
    'skipped. ' +
    'Returns { ok, affected } — the ids of the children promoted out of the groups.',
  inputSchema: ungroupNodesParams,
  kind: 'write',
  destructive: true,
};
