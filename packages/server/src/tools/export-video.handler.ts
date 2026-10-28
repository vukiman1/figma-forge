import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { EXPORT_VIDEO_TOOL_NAME, exportVideoParams } from '@figma-forge/core';
import { type ExportVideoResult, type VideoExport } from '@figma-forge/core';

import { binaryPayload } from './binary-payload.js';

export type ToolDispatcher = (toolName: string, args: unknown) => Promise<unknown>;

/**
 * Land the exported video bytes on the server filesystem. Pure-fs and dispatch-free so it can be
 * unit-tested against a temp directory. path is null (with the plugin's reason) when nothing
 * encoded.
 */
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

/** Reuses the plugin-side export_video handler to fetch the encoded bytes, then writes them to disk. */
export const handleExportVideo = async (
  dispatch: ToolDispatcher,
  rawArgs: unknown,
): Promise<ExportVideoResult> => {
  const { outPath, ...pluginArgs } = exportVideoParams.parse(rawArgs);
  const video = (await dispatch(EXPORT_VIDEO_TOOL_NAME, {
    // These bytes go to disk, never to a model, so they ride the wire as a msgpack `bin`.
    binary: true,
    ...pluginArgs,
  })) as VideoExport;
  return writeExportedVideo(outPath, video);
};
