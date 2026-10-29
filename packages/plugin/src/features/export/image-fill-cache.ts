import type { ImageFillBytes } from '@figma-forge/core';

import { exportPayload } from './export-payload.js';

export interface ResolvedImage {
  readonly payload: Pick<ImageFillBytes, 'base64' | 'bytes'>;
  readonly width: number;
  readonly height: number;
}

export type ImageFetcher = (hash: string) => Promise<ResolvedImage | null>;

const resolveImage = async (
  figmaCtx: typeof figma,
  hash: string,
  isBinary: boolean,
): Promise<ResolvedImage | null> => {
  const image = figmaCtx.getImageByHash(hash);
  if (image === null) return null;
  const [bytes, size] = await Promise.all([image.getBytesAsync(), image.getSizeAsync()]);
  return {
    payload: exportPayload(figmaCtx, bytes, isBinary),
    width: size.width,
    height: size.height,
  };
};

export const createImageFetcher = (figmaCtx: typeof figma, isBinary: boolean): ImageFetcher => {
  const cache = new Map<string, Promise<ResolvedImage | null>>();
  return async hash => {
    const cached = cache.get(hash);
    if (cached !== undefined) return cached;
    const pending = resolveImage(figmaCtx, hash, isBinary);
    cache.set(hash, pending);
    return pending;
  };
};
