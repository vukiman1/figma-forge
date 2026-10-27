import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const IMPORT_IMAGE_TOOL_NAME = 'import_image';

export const importImageParams = z.object({
  path: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Local image file to import (PNG / JPEG / GIF), read by the MCP server; relative paths ' +
        'resolve against its working directory',
    ),
  data: z.string().optional().describe('Base64-encoded image bytes (PNG / JPG / GIF)'),
  url: z.string().optional().describe('Image URL to fetch instead of data'),
  name: z.string().optional().describe('Optional name for the new rectangle'),
  parentId: z.string().optional().describe('Parent node id (default: current page)'),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional().describe('Override width (default: image width)'),
  height: z.number().optional().describe('Override height (default: image height)'),
  scaleMode: z.enum(['FILL', 'FIT', 'CROP', 'TILE']).optional(),
});

export const importImageTool: ToolSpec = {
  name: IMPORT_IMAGE_TOOL_NAME,
  description:
    'Import a raster image (PNG / JPG / GIF) and place it as a rectangle with an IMAGE fill. Provide ' +
    'exactly one of path (a local file the server reads), data (base64-encoded image bytes) or url. ' +
    'Prefer path for a file on this machine: the bytes never pass through the conversation, and a ' +
    'large base64 data argument can exceed the transport message limit. url is fetched by Figma, not ' +
    'by this machine, so it must be publicly reachable. Figma accepts at most 4096px in width and ' +
    'height whichever source is used, so downscale a camera-resolution photo before importing it. ' +
    'The rectangle defaults to the image size unless width/height are given. scaleMode is ' +
    'FILL / FIT / CROP / TILE (default FILL). For vector SVG (logos / icons) use import_svg instead. ' +
    'Returns { ok, nodeId, name, type }.',
  inputSchema: importImageParams,
  kind: 'write',
  serverOnlyArgs: ['path'],
};
