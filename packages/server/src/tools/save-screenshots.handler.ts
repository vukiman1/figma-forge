import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  GET_SCREENSHOT_TOOL_NAME,
  GetScreenshotResultSchema,
  saveScreenshotsParams,
} from '@figma-forge/core';
import {
  type SavedScreenshot,
  type SaveScreenshotsResult,
  type ScreenshotImage,
} from '@figma-forge/core';

import { binaryPayload } from './binary-payload.js';

const EXTENSIONS: Record<string, string> = { PNG: 'png', JPG: 'jpg', SVG: 'svg' };

const sanitize = (id: string): string => id.replace(/[^\w.-]/g, '-');

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

export const handleSaveScreenshots = async (
  dispatch: ToolDispatcher,
  rawArgs: unknown,
): Promise<SaveScreenshotsResult> => {
  const args = saveScreenshotsParams.parse(rawArgs);

  const screenshotArgs: Record<string, unknown> = { nodeIds: args.nodeIds };
  screenshotArgs.binary = true;
  if (args.format !== undefined) screenshotArgs.format = args.format;
  screenshotArgs.scale = args.scale ?? 1;

  const { images } = GetScreenshotResultSchema.parse(
    await dispatch(GET_SCREENSHOT_TOOL_NAME, screenshotArgs),
  );
  return writeScreenshots(args.outDir, images);
};
