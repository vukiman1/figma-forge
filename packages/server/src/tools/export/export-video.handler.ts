import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { EXPORT_VIDEO_TOOL_NAME, exportVideoParams, VideoExportSchema } from '@figma-forge/core';
import { type ExportVideoResult, type VideoExport } from '@figma-forge/core';

import { binaryPayload } from '../result/binary-payload.js';

export type ToolDispatcher = (toolName: string, args: unknown) => Promise<unknown>;

export const writeExportedVideo = async (
  outPath: string,
  video: VideoExport,
): Promise<ExportVideoResult> => {
  const miss = {
    ...(video.reason !== undefined ? { reason: video.reason } : {}),
    ...(video.error !== undefined ? { error: video.error } : {}),
  };
  const payload = binaryPayload(video);
  if (payload === null) {
    return { nodeId: video.nodeId, format: video.format, path: null, ...miss };
  }
  const path = resolve(outPath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, payload);
  return { nodeId: video.nodeId, format: video.format, path };
};

export const handleExportVideo = async (
  dispatch: ToolDispatcher,
  rawArgs: unknown,
): Promise<ExportVideoResult> => {
  const { outPath, ...pluginArgs } = exportVideoParams.parse(rawArgs);
  const video = VideoExportSchema.parse(
    await dispatch(EXPORT_VIDEO_TOOL_NAME, {
      binary: true,
      ...pluginArgs,
    }),
  );
  return writeExportedVideo(outPath, video);
};
