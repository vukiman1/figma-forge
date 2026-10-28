import {
  NAVIGATE_TO_PAGE_TOOL_NAME,
  navigateToPageParams,
  RENAME_PAGE_TOOL_NAME,
  renamePageParams,
} from '@figma-forge/core';

import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { nodeForOp } from '../live-node.js';
import { propsSpec } from './props.js';

interface CurrentPageState {
  readonly previous: string;
}

export const renamePageInverse: BatchInverse = defineInverse(
  RENAME_PAGE_TOOL_NAME,
  renamePageParams,
  propsSpec(RENAME_PAGE_TOOL_NAME, ({ pageId }: { readonly pageId: string }) => pageId, ['name']),
);

export const navigateToPageInverse: BatchInverse = defineInverse(
  NAVIGATE_TO_PAGE_TOOL_NAME,
  navigateToPageParams,
  {
    capture: async (figmaCtx, { pageId }): Promise<CurrentPageState> => {
      const page = await nodeForOp(figmaCtx, pageId, NAVIGATE_TO_PAGE_TOOL_NAME);
      if (page.type !== 'PAGE') {
        throw new Error(`${batchTool(NAVIGATE_TO_PAGE_TOOL_NAME)}: page ${pageId} not found`);
      }
      return { previous: figmaCtx.currentPage.id };
    },
    undo: async (figmaCtx, { previous }) => {
      if (figmaCtx.currentPage.id === previous) return undefined;
      const page = await figmaCtx.getNodeByIdAsync(previous);
      if (page?.type === 'PAGE') await figmaCtx.setCurrentPageAsync(page);
      return undefined;
    },
  },
);
