import { GET_SELECTION_TOOL_NAME as TOOL, type GetSelectionResult } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { RESULT_LIMIT_LABEL, resultCharBudget } from '../../serialize/result-budget.js';
import { serializeFlatNodes } from '../../serialize/serialize-runs.js';

export const createGetSelectionHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async () => {
    const page = figmaCtx.currentPage;
    const selection = page.selection;
    const run = await serializeFlatNodes(selection, resultCharBudget());
    if (!run.complete) {
      throw new Error(
        `${TOOL}: the ${selection.length} selected layers serialize past ` +
          `${RESULT_LIMIT_LABEL} — more than one tool result can carry. Select fewer layers, or ` +
          'read the frames you need one at a time with get_design_context.',
      );
    }
    const result: GetSelectionResult = { pageId: page.id, pageName: page.name, nodes: run.nodes };
    return result;
  };
