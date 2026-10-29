import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const ICON_MAP_TOOL_NAME = 'icon_map';

export const iconMapParams = z.object({
  nodeId: z.string().describe('Root node id; omit to use the selection or current page').optional(),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence at/above which a match counts as a reliable reuse (default 0.7)')
    .optional(),
  rootDir: z.string().describe('Project root to scan; defaults to the server cwd').optional(),
});

export const iconMapTool: ToolSpec = {
  name: ICON_MAP_TOOL_NAME,
  description:
    "Map the Figma icon nodes in a selection/subtree to the project's existing `.svg` files, so codegen " +
    'reuses the designer-curated asset instead of re-exporting a duplicate. Joins the grounded Figma icon ' +
    'names against the repo svg files (gitignore-aware scan), name-based and near-exact (a wrong icon is a ' +
    'silent visual bug, so unsure matches fall through to a fresh export rather than mis-reuse). Each match ' +
    'reports the file path, the color contract read from the file (currentColor / fixed / multi-color), and ' +
    'how to recolor it in this project (currentColor → text-{token}, gated on the svg mode since currentColor ' +
    'dies through an <img>). It does not fabricate the import line — compose it from the file path and ' +
    'profile.svg (importHint gives the loader form: svgr `?react` / vite-svg-loader `?component` / ' +
    "`{ ReactComponent }` / url `<img>`), mirroring the project's existing imports for the alias/relative " +
    'path. Unmatched icons are returned in `unmapped`; `iconLibraries` lists any installed icon component ' +
    'library (lucide / heroicons / iconify) as the alternative to a fresh export. rootDir defaults to the ' +
    'server cwd. Returns { mappings, unmapped, iconLibraries, profile }.',
  inputSchema: iconMapParams,
  kind: 'local',
  serverOnlyArgs: null,
};
