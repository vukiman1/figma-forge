import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const EXPORT_PDF_TOOL_NAME = 'export_pdf';

export const exportPdfParams = z.object({
  nodeId: z
    .string()
    .describe(
      'Node to export to a one-page PDF (a frame / section / component); omit for the current page',
    )
    .optional(),
  outPath: z.string().describe('File path to write the .pdf to (parent dirs created if missing)'),
});

export const exportPdfTool: ToolSpec = {
  name: EXPORT_PDF_TOOL_NAME,
  description:
    "Export a node (or the current page) to a single-page vector PDF file on disk. Figma's plugin " +
    'API renders one PDF page per node and cannot paginate a page into one-frame-per-page or merge ' +
    'multiple nodes into a multi-page file. Pass a frame / section / component id for a vector PDF ' +
    'of that node; omit nodeId for the current page (large pages can be slow). For raster output ' +
    '(PNG/JPG) use save_screenshots instead. Returns { nodeId, path, empty? }; path is null if the ' +
    'target is missing or not exportable, and empty:true means it rendered a blank PDF.',
  inputSchema: exportPdfParams,
  kind: 'local',
  serverOnlyArgs: ['outPath'],
  injectedArgs: ['binary'],
};
