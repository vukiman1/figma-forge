import { SCAN_TEXT_NODES_TOOL_NAME as TOOL, scanTextNodesParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { resultCharBudget, serializeFlatNodes, toNodeListResult } from '../../serializer.js';
import { collectMatches, resolveScope } from '../../traverse.js';
import { parseParams } from '../parse-params.js';

const isCopy = (node: SceneNode): boolean => node.type === 'TEXT' || node.type === 'TEXT_PATH';

export const createScanTextNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { root } = parseParams(TOOL, scanTextNodesParams, raw);
    const scope = await resolveScope(figmaCtx, root);
    const matches = await collectMatches(scope, isCopy);
    return toNodeListResult(matches, await serializeFlatNodes(matches, resultCharBudget()));
  };
