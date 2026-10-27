import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { GET_SCREENSHOT_TOOL_NAME, saveScreenshotsParams } from '@figma-forge/core';
import {
  type GetScreenshotResult,
  type SavedScreenshot,
  type SaveScreenshotsResult,
  type ScreenshotImage,
} from '@figma-forge/core';

import { binaryPayload } from './binary-payload.js';

const EXTENSIONS: Record<string, string> = { PNG: 'png', JPG: 'jpg', SVG: 'svg' };

/** Map a Figma node id (e.g. "1:2") to a filesystem-safe basename, blocking path traversal. */
const sanitize = (id: string): string => id.replace(/[^\w.-]/g, '-');

/**
 * Land the exported images as files under outDir (created if missing). Pure-fs and dispatch-free so
 * it can be unit-tested against a temp directory.
 */
export const writeScreenshots = async (
  outDir: string,
  images: readonly ScreenshotImage[],
): Promise<SaveScreenshotsResult> => {
  const dir = resolve(outDir);
  await mkdir(dir, { recursive: true });

  const saved: SavedScreenshot[] = await Promise.all(
    images.map(async (img): Promise<SavedScreenshot> => {
      const flags = {
        ...(img.empty === true ? { empty: true as const } : {}),
        ...(img.recovered === true ? { recovered: true as const } : {}),
      };
      const payload = binaryPayload(img);
      if (payload === null) return { nodeId: img.nodeId, format: img.format, path: null, ...flags };
      const ext = EXTENSIONS[img.format] ?? img.format.toLowerCase();
      const path = join(dir, `${sanitize(img.nodeId)}.${ext}`);
      await writeFile(path, payload);
      return { nodeId: img.nodeId, format: img.format, path, ...flags };
    }),
  );

  return { saved };
};

export type ToolDispatcher = (toolName: string, args: unknown) => Promise<unknown>;

/**
 * Reuses the plugin-side get_screenshot export (no dedicated plugin handler) to fetch the raster
 * bytes, then lands them on the server filesystem — the first server-side write tool.
 */
export const handleSaveScreenshots = async (
  dispatch: ToolDispatcher,
  rawArgs: unknown,
): Promise<SaveScreenshotsResult> => {
  const args = saveScreenshotsParams.parse(rawArgs);

  const screenshotArgs: Record<string, unknown> = { nodeIds: args.nodeIds };
  // These bytes go to disk, never to a model, so they ride the wire as a msgpack `bin`.
  screenshotArgs.binary = true;
  if (args.format !== undefined) screenshotArgs.format = args.format;
  // Always pass an explicit scale: an omitted scale makes get_screenshot auto-fit the raster for
  // model consumption, but files written to disk are user artifacts and must stay full-res.
  screenshotArgs.scale = args.scale ?? 1;

  const { images } = (await dispatch(
    GET_SCREENSHOT_TOOL_NAME,
    screenshotArgs,
  )) as GetScreenshotResult;
  return writeScreenshots(args.outDir, images);
};
