import {
  type ImageFillBytes,
  type ImageFillsResult,
  type NodeImageFills,
  SAVE_IMAGE_FILLS_TOOL_NAME as TOOL,
  saveImageFillsSandboxParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { createImageFetcher, type ImageFetcher } from './image-fill-cache.js';

const imageFillEntry = async (
  fetchImage: ImageFetcher,
  paint: ImagePaint,
  index: number,
): Promise<ImageFillBytes> => {
  const { scaleMode } = paint;
  const imageHash = paint.imageHash ?? null;
  if (imageHash === null) return { index, imageHash, base64: null, scaleMode };
  const image = await fetchImage(imageHash);
  if (image === null) return { index, imageHash, base64: null, scaleMode };
  const { payload, width, height } = image;
  return { index, imageHash, ...payload, width, height, scaleMode };
};

const imageFillsOf = async (
  figmaCtx: typeof figma,
  fetchImage: ImageFetcher,
  nodeId: string,
): Promise<NodeImageFills> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node === null || !('fills' in node)) return { nodeId, images: [] };
  const fills = node.fills;
  if (fills === figmaCtx.mixed) return { nodeId, images: [], mixed: true };
  const images = await Promise.all(
    fills.flatMap((paint, index) =>
      paint.type === 'IMAGE' ? [imageFillEntry(fetchImage, paint, index)] : [],
    ),
  );
  return { nodeId, images };
};

export const createSaveImageFillsHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeIds, binary = false } = parseParams(TOOL, saveImageFillsSandboxParams, raw);
    const fetchImage = createImageFetcher(figmaCtx, binary);
    const nodes = await Promise.all(
      nodeIds.map(async nodeId => imageFillsOf(figmaCtx, fetchImage, nodeId)),
    );
    const result: ImageFillsResult = { nodes };
    return result;
  };
