import { z } from 'zod';

import { binaryArgShape } from '../shared/injected-args-schema.js';
import { VIDEO_FPS, videoExportConstraintSchema } from '../shared/video-export-schema.js';
import type { ToolSpec } from '../tool-spec.js';

export const EXPORT_VIDEO_TOOL_NAME = 'export_video';

interface FpsChoice {
  readonly format: keyof typeof VIDEO_FPS;
  readonly fps?: number | undefined;
}

const requireFormatFps = ({ format, fps }: FpsChoice, ctx: z.RefinementCtx): void => {
  const allowed: readonly number[] = VIDEO_FPS[format];
  if (fps === undefined || allowed.includes(fps)) return;
  ctx.addIssue({
    code: 'custom',
    path: ['fps'],
    message: `${format} takes ${allowed.join(' / ')} fps`,
  });
};

const exportVideoShape = {
  nodeId: z
    .string()
    .describe(
      'A node in the animated frame to export; its enclosing top-level frame (a frame placed ' +
        'directly on a page) is what gets encoded — pass the frame itself or any descendant',
    ),
  format: z.enum(['MP4', 'GIF', 'WEBM']).describe('MP4 / WebM (video) or GIF (looping)'),
  fps: z
    .number()
    .describe('Frames per second (MP4/WebM: 12/24/30/60; GIF: 8/12/15/24/30). Defaults per format.')
    .optional(),
  quality: z
    .enum(['LOW', 'MEDIUM', 'HIGH'])
    .describe('MP4/WebM quality; ignored for GIF')
    .optional(),
  loopCount: z
    .number()
    .int()
    .min(0)
    .max(1000)
    .describe('GIF only: number of loops; 0 = loop forever')
    .optional(),
  constraint: videoExportConstraintSchema.optional(),
};

export const exportVideoParams = z
  .object({
    ...exportVideoShape,
    outPath: z
      .string()
      .describe('File path to write the video to (parent dirs created if missing)'),
  })
  .superRefine(requireFormatFps);

export const exportVideoSandboxParams = z
  .object({ ...exportVideoShape, ...binaryArgShape })
  .superRefine(requireFormatFps);

export const exportVideoTool: ToolSpec = {
  name: EXPORT_VIDEO_TOOL_NAME,
  description:
    'Export an animated Figma top-level frame to an MP4 / WebM / GIF file on disk. Pass any node in ' +
    'the frame (or the frame itself) — its enclosing top-level frame is encoded across the ' +
    "animation's duration. Requires the Figma Design editor and a frame with animated content " +
    '(Smart Animate / Motion keyframes); a static frame, a nested frame, or FigJam / Dev Mode ' +
    'yields path:null with a reason (and, when reason is `failed`, Figma’s own message in ' +
    'error). Encoding is a heavy render — call it on its own, not concurrently with other tool ' +
    'calls, or the render can fail. Returns { nodeId, format, path, reason?, error? }.',
  inputSchema: exportVideoParams,
  kind: 'local',
  serverOnlyArgs: ['outPath'],
  injectedArgs: ['binary'],
};
