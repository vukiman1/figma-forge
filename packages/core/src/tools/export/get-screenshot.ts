import { z } from 'zod';

import { SCREENSHOT_FORMATS } from '../../results/exports.js';
import type { ToolSpec } from '../tool-spec.js';

export const GET_SCREENSHOT_TOOL_NAME = 'get_screenshot';

export const getScreenshotTool: ToolSpec = {
  name: GET_SCREENSHOT_TOOL_NAME,
  description:
    'Export nodes as images the model can see, one image block per node: { images: [{ nodeId, format, ' +
    'base64, width?, height?, scale?, recovered?, empty? }] }. format is PNG (default) / JPG / SVG. ' +
    'scale applies to raster formats; when omitted, each node is auto-fitted to a legible size ' +
    '(long edge into ~512–2576px: oversized frames scale down, tiny icons scale up ≤4x) — pass an ' +
    'explicit scale to force one. An explicit scale is capped so the long edge stays within 2576px, ' +
    'the most a vision model resolves: past that the model sees the identical pixels, so the extra ' +
    'bytes buy no detail — use save_screenshots when you need a full-res file on disk. Past 20 ' +
    'nodes in one call the whole batch drops to a 2000px long edge, which is what providers require ' +
    'of many-image requests; ask for fewer nodes when you need the detail. A batch is also capped ' +
    'by total size, not just resolution: a full-page frame is ~2.4MB, so 3–4 of them fill one ' +
    'response. Past that the remaining nodes come back labelled but not inlined, with a note naming ' +
    'them — re-request those ids in a follow-up call, or use save_screenshots for many nodes at once. ' +
    'Each raster label reports the exported width×height px and the ' +
    'scale, the anchor for mapping raster px back to design px. base64 is null for missing or ' +
    'non-exportable nodes. Nodes that are fully clipped or off-canvas (carousels, masks, off-screen ' +
    'states) are auto-recovered at their intrinsic bounds and flagged recovered:true. empty:true ' +
    'means the node genuinely renders nothing even unclipped (hidden / no content) so the export is blank.',
  inputSchema: z.object({
    nodeIds: z.array(z.string()).describe('Figma node ids to export'),
    format: z
      .enum(SCREENSHOT_FORMATS)
      .describe('Export format: PNG (default) / JPG / SVG')
      .optional(),
    scale: z
      .number()
      .positive()
      .describe('Raster scale factor (PNG/JPG); omit to auto-fit each node to a legible size')
      .optional(),
  }),
  kind: 'read',
  injectedArgs: ['forVision', 'binary'],
};
