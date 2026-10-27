import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const REMOVE_REACTIONS_TOOL_NAME = 'remove_reactions';

export const removeReactionsParams = z.object({
  nodeId: z.string().describe('Node to clear reactions from'),
});

export const removeReactionsTool: ToolSpec = {
  name: REMOVE_REACTIONS_TOOL_NAME,
  description:
    'Clear every prototype reaction from a node (equivalent to set_reactions with an empty array). ' +
    'Use this to strip interactivity; to replace reactions with new ones use set_reactions. Returns ' +
    '{ ok, nodeId }.',
  inputSchema: removeReactionsParams,
  kind: 'write',
  destructive: true,
};
