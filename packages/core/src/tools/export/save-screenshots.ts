import { z } from 'zod';

import { SCREENSHOT_FORMATS } from '../../results/exports.js';
import type { ToolSpec } from '../tool-spec.js';

export const SAVE_SCREENSHOTS_TOOL_NAME = 'save_screenshots';

export const saveScreenshotsParams = z.object({
  nodeIds: z.array(z.string()).min(1).describe('Figma node ids to export'),
  outDir: z.string().describe('Directory to write files into (created if missing)'),
  format: z
    .enum(SCREENSHOT_FORMATS)
    .describe('Export format: PNG (default) / JPG / SVG')
    .optional(),
  scale: z.number().positive().describe('Raster scale factor (PNG/JPG), default 1').optional(),
});

export const saveScreenshotsTool: ToolSpec = {
  name: SAVE_SCREENSHOTS_TOOL_NAME,
  description:
    'Export nodes and write them to disk under outDir: { saved: [{ nodeId, format, path, recovered?, empty? }] }. ' +
    'format is PNG (default) / JPG / SVG; scale applies to raster formats (default 1). ' +
    'path is null for missing or non-exportable nodes. Nodes that are fully clipped or off-canvas ' +
    "(e.g. a carousel's edge items) are auto-recovered at their intrinsic bounds and flagged recovered:true. " +
    'empty:true means the node genuinely renders nothing even unclipped (hidden / no content) so the file is blank. ' +
    'Files are named after a sanitized node id.',
  inputSchema: saveScreenshotsParams,
  kind: 'local',
  serverOnlyArgs: null,
};
