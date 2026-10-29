import { z } from 'zod';

export const SCREENSHOT_FORMATS = ['PNG', 'JPG', 'SVG'] as const;
export type ScreenshotFormat = (typeof SCREENSHOT_FORMATS)[number];

export const ExportBytesSchema = z
  .custom<Uint8Array>(value => value instanceof Uint8Array)
  .optional();

export const ScreenshotImageSchema = z.object({
  nodeId: z.string(),
  format: z.string(),
  base64: z.string().nullable(),
  empty: z.boolean().optional(),
  recovered: z.boolean().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  scale: z.number().optional(),
  bytes: ExportBytesSchema,
});
export type ScreenshotImage = z.infer<typeof ScreenshotImageSchema>;

export const GetScreenshotResultSchema = z.object({ images: z.array(ScreenshotImageSchema) });
export type GetScreenshotResult = z.infer<typeof GetScreenshotResultSchema>;

export const SavedScreenshotSchema = z.object({
  nodeId: z.string(),
  format: z.string(),
  path: z.string().nullable(),
  empty: z.boolean().optional(),
  recovered: z.boolean().optional(),
});
export type SavedScreenshot = z.infer<typeof SavedScreenshotSchema>;

export const SaveScreenshotsResultSchema = z.object({ saved: z.array(SavedScreenshotSchema) });
export type SaveScreenshotsResult = z.infer<typeof SaveScreenshotsResultSchema>;

export const PdfExportSchema = z.object({
  nodeId: z.string(),
  base64: z.string().nullable(),
  empty: z.boolean().optional(),
  bytes: ExportBytesSchema,
});
export type PdfExport = z.infer<typeof PdfExportSchema>;

export const ExportPdfResultSchema = z.object({
  nodeId: z.string(),
  path: z.string().nullable(),
  empty: z.boolean().optional(),
});
export type ExportPdfResult = z.infer<typeof ExportPdfResultSchema>;

export const VIDEO_FORMATS = ['MP4', 'GIF', 'WEBM'] as const;
export type VideoFormat = (typeof VIDEO_FORMATS)[number];

export const VIDEO_EXPORT_MISS_REASONS = [
  'not-found',
  'no-top-level-frame',
  'wrong-editor',
  'failed',
] as const;
export type VideoExportMissReason = (typeof VIDEO_EXPORT_MISS_REASONS)[number];

export const VideoExportSchema = z.object({
  nodeId: z.string(),
  format: z.enum(VIDEO_FORMATS),
  base64: z.string().nullable(),
  reason: z.enum(VIDEO_EXPORT_MISS_REASONS).optional(),
  error: z.string().optional(),
  bytes: ExportBytesSchema,
});
export type VideoExport = z.infer<typeof VideoExportSchema>;

export const ExportVideoResultSchema = z.object({
  nodeId: z.string(),
  format: z.enum(VIDEO_FORMATS),
  path: z.string().nullable(),
  reason: z.enum(VIDEO_EXPORT_MISS_REASONS).optional(),
  error: z.string().optional(),
});
export type ExportVideoResult = z.infer<typeof ExportVideoResultSchema>;

export const ImageFillBytesSchema = z.object({
  index: z.number(),
  imageHash: z.string().nullable(),
  base64: z.string().nullable(),
  width: z.number().optional(),
  height: z.number().optional(),
  scaleMode: z.string().optional(),
  bytes: ExportBytesSchema,
});
export type ImageFillBytes = z.infer<typeof ImageFillBytesSchema>;

export const NodeImageFillsSchema = z.object({
  nodeId: z.string(),
  images: z.array(ImageFillBytesSchema),
  mixed: z.boolean().optional(),
});
export type NodeImageFills = z.infer<typeof NodeImageFillsSchema>;

export const ImageFillsResultSchema = z.object({ nodes: z.array(NodeImageFillsSchema) });
export type ImageFillsResult = z.infer<typeof ImageFillsResultSchema>;

export const SavedImageFillSchema = z.object({
  index: z.number(),
  imageHash: z.string().nullable(),
  format: z.string().optional(),
  path: z.string().nullable(),
  width: z.number().optional(),
  height: z.number().optional(),
  scaleMode: z.string().optional(),
});
export type SavedImageFill = z.infer<typeof SavedImageFillSchema>;

export const SavedNodeImageFillsSchema = z.object({
  nodeId: z.string(),
  images: z.array(SavedImageFillSchema),
  mixed: z.boolean().optional(),
});
export type SavedNodeImageFills = z.infer<typeof SavedNodeImageFillsSchema>;

export const SaveImageFillsResultSchema = z.object({ nodes: z.array(SavedNodeImageFillsSchema) });
export type SaveImageFillsResult = z.infer<typeof SaveImageFillsResultSchema>;
