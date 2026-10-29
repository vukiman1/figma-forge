import { IMPORT_IMAGE_TOOL_NAME as TOOL, importImageParams } from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { InvalidParamsError, parseParams } from '../parse-params.js';
import { createdResult, setNameAndPosition } from './new-node.js';
import { placeNode } from './place-node.js';

interface ImageSource {
  readonly data?: string | undefined;
  readonly url?: string | undefined;
}

const loadImage = async (figmaCtx: typeof figma, { data, url }: ImageSource): Promise<Image> => {
  if (data !== undefined) return figmaCtx.createImage(figmaCtx.base64Decode(data));
  if (url !== undefined) return figmaCtx.createImageAsync(url);
  throw new InvalidParamsError(`${TOOL}: provide data (base64) or url`);
};

export const createImportImageHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const {
      scaleMode = 'FILL',
      width,
      height,
      ...params
    } = parseParams(TOOL, importImageParams, raw);
    const image = await loadImage(figmaCtx, params);
    const size = await image.getSizeAsync();
    const rect = figmaCtx.createRectangle();
    rect.resize(width ?? size.width, height ?? size.height);
    setNameAndPosition(rect, params);
    rect.fills = [{ type: 'IMAGE', scaleMode, imageHash: image.hash }];
    await placeNode(figmaCtx, rect, params.parentId, TOOL);
    return createdResult(rect);
  };
