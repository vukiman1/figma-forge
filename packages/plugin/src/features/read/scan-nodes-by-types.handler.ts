import { SCAN_NODES_BY_TYPES_TOOL_NAME as TOOL, scanNodesByTypesParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { resultCharBudget, serializeFlatNodes, toNodeListResult } from '../../serializer.js';
import { collectMatches, resolveScope } from '../../traverse.js';
import { parseParams } from '../parse-params.js';

export const createScanNodesByTypesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { types, root } = parseParams(TOOL, scanNodesByTypesParams, raw);
    const wanted = new Set(types);
    const scope = await resolveScope(figmaCtx, root);
    const matches = await collectMatches(scope, node => wanted.has(node.type));
    return toNodeListResult(matches, await serializeFlatNodes(matches, resultCharBudget()));
  };
