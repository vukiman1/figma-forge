import {
  EXPORT_VIDEO_TOOL_NAME as TOOL,
  exportVideoSandboxParams,
  type VideoExport,
  type VideoExportMissReason,
  type VideoFormat,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { errorMessage } from '../error-message.js';
import { parseParams } from '../parse-params.js';
import { exportPayload, isExportable } from './export-payload.js';
import { toVideoSettings } from './video-settings.js';

const DESIGN_EDITOR = 'figma';

interface Miss {
  readonly nodeId: string;
  readonly reason: VideoExportMissReason;
  readonly error?: string;
}

const missed = (format: VideoFormat, { nodeId, reason, error }: Miss): VideoExport => ({
  nodeId,
  format,
  base64: null,
  reason,
  ...(error !== undefined && { error }),
});

const topLevelFrameOf = async (
  figmaCtx: typeof figma,
  nodeId: string,
): Promise<(FrameNode & ExportMixin) | Miss> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node === null || !('getTopLevelFrame' in node)) return { nodeId, reason: 'not-found' };
  const frame = node.getTopLevelFrame();
  if (frame === undefined || !isExportable(frame)) return { nodeId, reason: 'no-top-level-frame' };
  return frame;
};

export const createExportVideoHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, exportVideoSandboxParams, raw);
    const { nodeId, format, binary = false } = params;
    if (figmaCtx.editorType !== DESIGN_EDITOR) {
      return missed(format, { nodeId, reason: 'wrong-editor' });
    }
    const frame = await topLevelFrameOf(figmaCtx, nodeId);
    if ('reason' in frame) return missed(format, frame);
    try {
      const bytes = await frame.exportAsync(toVideoSettings(params));
      const result: VideoExport = {
        nodeId: frame.id,
        format,
        ...exportPayload(figmaCtx, bytes, binary),
      };
      return result;
    } catch (error) {
      return missed(format, { nodeId: frame.id, reason: 'failed', error: errorMessage(error) });
    }
  };
