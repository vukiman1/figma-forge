import { SEARCH_NODES_TOOL_NAME as TOOL, searchNodesParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { resultCharBudget, serializeFlatNodes, toNodeListResult } from '../../serializer.js';
import { collectMatches, resolveScope } from '../../traverse.js';
import { parseParams } from '../parse-params.js';

const matcherFor = (
  name: string | undefined,
  type: string | undefined,
): ((node: SceneNode) => boolean) => {
  const needle = name?.toLowerCase();
  return node => {
    if (type !== undefined && node.type !== type) return false;
    return needle === undefined || node.name.toLowerCase().includes(needle);
  };
};

export const createSearchNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { name, type, root } = parseParams(TOOL, searchNodesParams, raw);
    const scope = await resolveScope(figmaCtx, root);
    const matches = await collectMatches(scope, matcherFor(name, type));
    return toNodeListResult(matches, await serializeFlatNodes(matches, resultCharBudget()));
  };
