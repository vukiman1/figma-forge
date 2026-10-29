import { UPDATE_FLOWS_TOOL_NAME, updateFlowsParams } from '@figma-forge/core';

import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { nodeForOp } from '../live-node.js';

export const updateFlowsInverse: BatchInverse = defineInverse(
  UPDATE_FLOWS_TOOL_NAME,
  updateFlowsParams,
  {
    capture: async (figmaCtx, { pageId }): Promise<null> => {
      const page = await nodeForOp(figmaCtx, pageId, UPDATE_FLOWS_TOOL_NAME);
      if (page.type !== 'PAGE') {
        throw new Error(`${batchTool(UPDATE_FLOWS_TOOL_NAME)}: ${pageId} is not a page`);
      }
      return null;
    },
    undo: async () => undefined,
  },
);
