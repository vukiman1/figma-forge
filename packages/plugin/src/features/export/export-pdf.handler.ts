import {
  EXPORT_PDF_TOOL_NAME as TOOL,
  exportPdfSandboxParams,
  type PdfExport,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { exportPayload, isExportable } from './export-payload.js';

const rendersNothing = (node: BaseNode): boolean =>
  'absoluteRenderBounds' in node && node.absoluteRenderBounds === null;

export const createExportPdfHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, binary = false } = parseParams(TOOL, exportPdfSandboxParams, raw);
    const node =
      nodeId === undefined ? figmaCtx.currentPage : await figmaCtx.getNodeByIdAsync(nodeId);
    if (node === null || !isExportable(node)) {
      const miss: PdfExport = { nodeId: nodeId ?? '', base64: null };
      return miss;
    }
    const bytes = await node.exportAsync({ format: 'PDF' });
    const result: PdfExport = {
      nodeId: node.id,
      ...exportPayload(figmaCtx, bytes, binary),
      ...(rendersNothing(node) && { empty: true }),
    };
    return result;
  };
