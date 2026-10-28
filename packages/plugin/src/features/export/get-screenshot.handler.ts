import {
  GET_SCREENSHOT_TOOL_NAME as TOOL,
  type GetScreenshotResult,
  getScreenshotSandboxParams,
  type ScreenshotImage,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { isExportable } from './export-payload.js';
import { exportScreenshot, type ScreenshotOptions } from './screenshot-export.js';
import { longEdgeCeilingFor } from './screenshot-scale.js';

const DEFAULT_FORMAT = 'PNG';

const screenshotOf = async (
  figmaCtx: typeof figma,
  nodeId: string,
  options: ScreenshotOptions,
): Promise<ScreenshotImage> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node === null || !isExportable(node)) return { nodeId, format: options.format, base64: null };
  return exportScreenshot(figmaCtx, node, options);
};

export const createGetScreenshotHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, getScreenshotSandboxParams, raw);
    const { nodeIds, format = DEFAULT_FORMAT, forVision = false, binary = false } = params;
    const options: ScreenshotOptions = {
      format,
      isBinary: binary,
      scale: {
        requested: params.scale,
        isForVision: forVision,
        longEdgeCeiling: longEdgeCeilingFor(nodeIds.length, forVision),
      },
    };
    const images = await Promise.all(
      nodeIds.map(async nodeId => screenshotOf(figmaCtx, nodeId, options)),
    );
    const result: GetScreenshotResult = { images };
    return result;
  };
