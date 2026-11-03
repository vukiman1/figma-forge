import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  ImageFillsResultSchema,
  SAVE_IMAGE_FILLS_TOOL_NAME,
  saveImageFillsParams,
} from '@figma-forge/core';
import {
  type NodeImageFills,
  type SaveImageFillsResult,
  type SavedImageFill,
  type SavedNodeImageFills,
} from '@figma-forge/core';

import { binaryPayload } from '../result/binary-payload.js';

export const detectImageFormat = (bytes: Buffer): { format: string; ext: string } => {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return { format: 'PNG', ext: 'png' };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { format: 'JPG', ext: 'jpg' };
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)
    return { format: 'GIF', ext: 'gif' };
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return { format: 'WEBP', ext: 'webp' };
  return { format: 'BIN', ext: 'bin' };
};

const sanitize = (hash: string): string => hash.replace(/[^\w.-]/g, '-');

const carry = (img: NodeImageFills['images'][number]): Omit<SavedImageFill, 'format' | 'path'> => ({
  index: img.index,
  imageHash: img.imageHash,
  ...(img.width !== undefined ? { width: img.width } : {}),
  ...(img.height !== undefined ? { height: img.height } : {}),
  ...(img.scaleMode !== undefined ? { scaleMode: img.scaleMode } : {}),
});

export const writeImageFills = async (
  outDir: string,
  nodes: readonly NodeImageFills[],
): Promise<SaveImageFillsResult> => {
  const dir = resolve(outDir);
  await mkdir(dir, { recursive: true });

  const toWrite = new Map<string, Buffer>();
  const outNodes: SavedNodeImageFills[] = nodes.map(node => {
    const images: SavedImageFill[] = node.images.map(img => {
      const buf = binaryPayload(img);
      if (buf === null || img.imageHash === null) return { ...carry(img), path: null };
      const { format, ext } = detectImageFormat(buf);
      const path = join(dir, `${sanitize(img.imageHash)}.${ext}`);
      if (!toWrite.has(path)) toWrite.set(path, buf);
      return { ...carry(img), format, path };
    });
    return { nodeId: node.nodeId, images, ...(node.mixed === true ? { mixed: true } : {}) };
  });

  await Promise.all([...toWrite].map(([path, buf]) => writeFile(path, buf)));
  return { nodes: outNodes };
};

export type ToolDispatcher = (toolName: string, args: unknown) => Promise<unknown>;

export const handleSaveImageFills = async (
  dispatch: ToolDispatcher,
  rawArgs: unknown,
): Promise<SaveImageFillsResult> => {
  const args = saveImageFillsParams.parse(rawArgs);
  const { nodes } = ImageFillsResultSchema.parse(
    await dispatch(SAVE_IMAGE_FILLS_TOOL_NAME, {
      binary: true,
      nodeIds: args.nodeIds,
    }),
  );
  return writeImageFills(args.outDir, nodes);
};
