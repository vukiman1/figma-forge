import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const COMPONENT_MAP_TOOL_NAME = 'component_map';

export const componentMapParams = z.object({
  nodeId: z.string().describe('Root node id; omit to use the selection or current page').optional(),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence at/above which a match counts as a reliable reuse (default 0.7)')
    .optional(),
  rootDir: z.string().describe('Project root to scan; defaults to the server cwd').optional(),
});

export const componentMapTool: ToolSpec = {
  name: COMPONENT_MAP_TOOL_NAME,
  description:
    'Map the Figma component instances in a selection/subtree to existing local code components, so ' +
    'they can be reused instead of regenerated. Joins the grounded Figma component names (and their ' +
    'variant axes) against an AST scan of the project; an explicit docs/figma-component-map.md row ' +
    '(FigmaName | code/path) overrides the fuzzy match — this file is the durable record a verified ' +
    'mapping is written back to, so the next run reuses it instead of re-guessing. A row whose ' +
    'target no longer resolves (deleted/renamed) is reported in staleOverrides and degrades to the ' +
    'fuzzy result rather than a phantom import. Each distinct component is mapped once with all its ' +
    'instance ids. A mapped candidate also reports matchedProps (Figma axes the component already ' +
    'has) and unmatchedProps (axes it lacks → component-extension TODOs). ' +
    'Returns { mappings (candidate + confidence + status high/medium/low/unmapped), unmapped, ' +
    'staleOverrides, profile }.',
  inputSchema: componentMapParams,
  kind: 'local',
  serverOnlyArgs: null,
};
