import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const DELETE_VARIABLE_COLLECTION_TOOL_NAME = 'delete_variable_collection';

export const deleteVariableCollectionParams = z.object({
  collectionId: z.string().describe('Variable collection id to delete'),
});

export const deleteVariableCollectionTool: ToolSpec = {
  name: DELETE_VARIABLE_COLLECTION_TOOL_NAME,
  description:
    'Delete a variable collection by id, removing the collection and every variable and mode in ' +
    'it; bindings to those variables revert to their raw values. To delete a single variable ' +
    'instead, use delete_variable. Returns { ok, collectionId, name }.',
  inputSchema: deleteVariableCollectionParams,
  kind: 'write',
  destructive: true,
};
