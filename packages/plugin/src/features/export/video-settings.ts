import { type exportVideoSandboxParams, VIDEO_FPS } from '@figma-forge/core';
import type { z } from 'zod';

type VideoParams = z.output<typeof exportVideoSandboxParams>;

export type VideoSettings = ExportSettingsMP4 | ExportSettingsGIF | ExportSettingsWEBM;

const isOneOf = <T extends number>(value: number, allowed: readonly T[]): value is T =>
  allowed.some(candidate => candidate === value);

const fpsFor = <T extends number>(fps: number | undefined, allowed: readonly T[]): { fps?: T } =>
  fps !== undefined && isOneOf(fps, allowed) ? { fps } : {};

export const toVideoSettings = (params: VideoParams): VideoSettings => {
  const { format, fps, quality, loopCount, constraint } = params;
  const shared = { ...(constraint !== undefined && { constraint }) };
  if (format === 'GIF') {
    return {
      format,
      ...shared,
      ...fpsFor(fps, VIDEO_FPS.GIF),
      ...(loopCount !== undefined && { loopCount }),
    };
  }
  return {
    format,
    ...shared,
    ...fpsFor(fps, VIDEO_FPS[format]),
    ...(quality !== undefined && { quality }),
  };
};
