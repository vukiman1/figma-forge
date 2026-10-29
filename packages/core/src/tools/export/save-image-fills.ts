import { z } from 'zod';

import { binaryArgShape } from '../shared/injected-args-schema.js';
import type { ToolSpec } from '../tool-spec.js';

export const SAVE_IMAGE_FILLS_TOOL_NAME = 'save_image_fills';

export const saveImageFillsParams = z.object({
  nodeIds: z.array(z.string()).min(1).describe('Figma node ids whose IMAGE fills to extract'),
  outDir: z
    .string()
    .describe('Directory to write the original image files into (created if missing)'),
});

export const saveImageFillsSandboxParams = saveImageFillsParams
  .omit({ outDir: true })
  .extend(binaryArgShape);

export const saveImageFillsTool: ToolSpec = {
  name: SAVE_IMAGE_FILLS_TOOL_NAME,
  description:
    "Extract the ORIGINAL image bytes behind each node's IMAGE fills and write them to disk under " +
    'outDir — the source asset exactly as uploaded (no mask, clip, crop, scale, or effects applied), ' +
    'unlike save_screenshots / get_screenshot which re-render the composited node. Returns ' +
    '{ nodes: [{ nodeId, images: [{ index, imageHash, format, path, width?, height?, scaleMode? }], ' +
    'mixed? }] }. index is the fill position in node.fills; width/height are the image intrinsic size; ' +
    'scaleMode is how the fill is displayed (FILL / FIT / CROP / TILE); format is sniffed from the ' +
    'bytes (PNG / JPG / GIF / WEBP, or BIN if unrecognized). Identical images (same imageHash reused ' +
    'across nodes) are fetched once and share one file named by hash. path is null when the fill image ' +
    "can't be resolved; images:[] means the node has no image fill; mixed:true means the node's fills " +
    'are per-text-range and were not enumerated. For a rendered/composited raster use save_screenshots; ' +
    'for a vector node use export_pdf.',
  inputSchema: saveImageFillsParams,
  kind: 'local',
  serverOnlyArgs: ['outDir'],
  injectedArgs: ['binary'],
};
