import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const DESIGN_DIFF_TOOL_NAME = 'design_diff';

export const designDiffParams = z.object({
  nodeId: z
    .string()
    .describe('Node to snapshot / diff (a pasted Figma URL also works); omit to use the selection')
    .optional(),
  rootDir: z.string().describe('Project root; defaults to the server cwd').optional(),
  update: z
    .boolean()
    .describe('After diffing, overwrite the baseline with the current design (accept the changes)')
    .optional(),
});

export const designDiffTool: ToolSpec = {
  name: DESIGN_DIFF_TOOL_NAME,
  description:
    'Diff a Figma node against a saved baseline of itself, so after a design changes you edit only ' +
    'the affected code instead of regenerating. First call on a node saves a baseline (its ' +
    'get_design_context, full detail) under .figma-forge/snapshots/ and returns status ' +
    "'baseline-created'; a later call returns status 'diff' with the per-node, per-property changes " +
    '(added / removed / changed nodes; fills, layout/padding, text, token bindings — resolved to ' +
    "readable values, not opaque ids) or 'no-changes'. Pass update:true to accept the current design " +
    'as the new baseline (re-snapshot). nodeId defaults to the selection; rootDir defaults to the ' +
    'server cwd. The baseline is a plain file the tool writes under the project — committing it (so ' +
    'teammates share the baseline) or gitignoring it is your call; the tool never changes git. It ' +
    'never mutates Figma. Scope by a component / section nodeId, the same unit codegen works on.',
  inputSchema: designDiffParams,
  kind: 'local',
  serverOnlyArgs: null,
};
