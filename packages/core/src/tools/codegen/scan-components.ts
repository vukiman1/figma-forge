import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const SCAN_COMPONENTS_TOOL_NAME = 'scan_components';

export const scanComponentsParams = z.object({
  rootDir: z.string().describe('Project root to scan; defaults to the server cwd').optional(),
  extensions: z
    .array(z.string())
    .describe('Component file extensions to scan; defaults to the detected profile')
    .optional(),
});

export const scanComponentsTool: ToolSpec = {
  name: SCAN_COMPONENTS_TOOL_NAME,
  description:
    'Scan the local project for existing UI components so they can be reused instead of regenerated. ' +
    'Runs on the server filesystem, not in Figma. Identifies components by AST signature (exported, ' +
    'PascalCase, function-ish) rather than by folder layout, so any structure works. React (.tsx/.jsx) ' +
    'is parsed for name + props; Vue/Svelte derive the name from the file and parse props from the ' +
    '<script> block (defineProps / export let / $props). extensions defaults to the ' +
    "detected profile's; rootDir defaults to the server cwd. Returns { components, profile }.",
  inputSchema: scanComponentsParams,
  kind: 'local',
  serverOnlyArgs: null,
};
