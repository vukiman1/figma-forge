import {
  type ImageFillResult,
  SET_IMAGE_FILL_TOOL_NAME as TOOL,
  setImageFillParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { imagePaintFor } from './image-paint.js';
import { writePaints } from './write-paints.js';

type FillableNode = BaseNode & MinimalFillsMixin;

const requireFillable = async (
  figmaCtx: typeof figma,
  nodeId: string,
): Promise<{ node: FillableNode; fills: readonly Paint[] }> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node === null || !('fills' in node)) {
    throw new Error(`${TOOL}: node ${nodeId} not found or cannot have fills`);
  }
  if (node.fills === figmaCtx.mixed) {
    throw new Error(
      `${TOOL}: text ${nodeId} has different fills across its characters — give it one fill ` +
        'with set_fills first',
    );
  }
  return { node, fills: node.fills };
};

const assertInRange = (
  fills: readonly Paint[],
  index: number | undefined,
  nodeId: string,
): void => {
  if (index === undefined || index < fills.length) return;
  const omit = fills.length === 0 ? 'add the image' : 'replace the image or add one on top';
  throw new Error(
    `${TOOL}: node ${nodeId} has ${fills.length} fill(s), so index ${index} is out of range — ` +
      `omit index to ${omit}`,
  );
};

const slotFor = (fills: readonly Paint[], index: number | undefined): number => {
  if (index !== undefined) return index;
  const topImage = fills.map(paint => paint.type).lastIndexOf('IMAGE');
  return topImage >= 0 ? topImage : fills.length;
};

type ImageSource = { kind: 'data'; data: string } | { kind: 'url'; url: string };

const imageSourceOf = (data: string | undefined, url: string | undefined): ImageSource => {
  if (data !== undefined && url === undefined) return { kind: 'data', data };
  if (url !== undefined && data === undefined) return { kind: 'url', url };
  throw new TypeError(`${TOOL}: provide exactly one of data (base64) or url`);
};

const createImage = async (figmaCtx: typeof figma, source: ImageSource): Promise<Image> =>
  source.kind === 'data'
    ? figmaCtx.createImage(figmaCtx.base64Decode(source.data))
    : figmaCtx.createImageAsync(source.url);

const placeImage = (fills: readonly Paint[], at: number, paint: ImagePaint): Paint[] => {
  const next = [...fills];
  next.splice(at, at < fills.length ? 1 : 0, paint);
  return next;
};

export const createSetImageFillHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, data, url, index, scaleMode } = parseParams(TOOL, setImageFillParams, raw);
    const source = imageSourceOf(data, url);
    const { node, fills } = await requireFillable(figmaCtx, nodeId);
    assertInRange(fills, index, nodeId);
    const image = await createImage(figmaCtx, source);
    const size = await image.getSizeAsync();
    const at = slotFor(fills, index);
    const paint = imagePaintFor(fills[at], image.hash, scaleMode);
    await writePaints(node, 'fills', placeImage(fills, at, paint));
    const written = node.fills === figmaCtx.mixed ? undefined : node.fills[at];
    if (written?.type !== 'IMAGE' || written.imageHash !== image.hash) {
      throw new Error(`${TOOL}: Figma did not keep the image in fill ${at} of ${nodeId}`);
    }
    const result: ImageFillResult = {
      ok: true,
      nodeId: node.id,
      index: at,
      imageHash: image.hash,
      width: size.width,
      height: size.height,
    };
    return result;
  };
