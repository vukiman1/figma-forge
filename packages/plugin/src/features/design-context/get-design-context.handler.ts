import {
  computeMetrics,
  dedupeStyles,
  DESIGN_CONTEXT_BAIL_NODES,
  type DesignContextNode,
  GET_DESIGN_CONTEXT_TOOL_NAME as TOOL,
  type GetDesignContextResult,
  getDesignContextSandboxParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { displayP3Marker } from '../color-space.js';
import { parseParams } from '../parse-params.js';
import { breakpointHint } from './breakpoint-hint.js';
import { type BuildContext, buildNode } from './build-node.js';
import { depthFromParam } from './depth.js';
import { resolveRoots } from './resolve-roots.js';
import { resolveTokens } from './resolve-tokens.js';
import { countNodes, sectionPlanResult } from './section-plan.js';
import { resolveVariableModes } from './variable-modes.js';

const DEFAULT_DETAIL = 'compact';

const groundFully = async (
  figmaCtx: typeof figma,
  roots: readonly SceneNode[],
  nodes: DesignContextNode[],
  result: GetDesignContextResult,
): Promise<GetDesignContextResult> => {
  await resolveVariableModes(figmaCtx, roots, nodes);
  const tokens = await resolveTokens(figmaCtx, nodes);
  const { nodes: deduped, globalVars } = dedupeStyles(nodes);
  const grounded: GetDesignContextResult = {
    ...result,
    ...tokens,
    nodes: deduped,
    ...(Object.keys(globalVars.styles).length > 0 && { globalVars }),
  };
  return { ...grounded, metrics: computeMetrics(nodes, grounded) };
};

export const createGetDesignContextHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, getDesignContextSandboxParams, raw);
    const remainingDepth = depthFromParam(params.depth);
    const ctx: BuildContext = {
      detail: params.detail ?? DEFAULT_DETAIL,
      shouldDedupe: params.dedupeComponents === true,
      seenMainComponents: new Set<string>(),
      lookup: async id => figmaCtx.getNodeByIdAsync(id),
    };
    const roots = await resolveRoots(figmaCtx, params.nodeId);
    if (params.budget === true && ctx.detail === 'full') {
      const total = countNodes(roots, remainingDepth);
      if (total > DESIGN_CONTEXT_BAIL_NODES) return sectionPlanResult(roots, total);
    }
    const nodes = await Promise.all(roots.map(async root => buildNode(root, remainingDepth, ctx)));
    const hint = breakpointHint(roots);
    const result: GetDesignContextResult = {
      ...displayP3Marker(figmaCtx),
      nodes,
      ...(hint !== undefined && { hint }),
    };
    return ctx.detail === 'full' ? groundFully(figmaCtx, roots, nodes, result) : result;
  };
