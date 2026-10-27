import { z } from 'zod';

import { SerializedAnnotationSchema } from '../model/component.js';
import { SerializedFontNameSchema } from '../model/text.js';
import { PageRefSchema } from './node-queries.js';

export const FileInfoSchema = z.object({
  fileKey: z.string().nullable(),
  fileName: z.string(),
  currentPage: PageRefSchema,
});
export type FileInfo = z.infer<typeof FileInfoSchema>;

export const ListFilesResultSchema = z.object({ files: z.array(FileInfoSchema) });
export type ListFilesResult = z.infer<typeof ListFilesResultSchema>;

export const GetViewportResultSchema = z.object({
  center: z.object({ x: z.number(), y: z.number() }),
  zoom: z.number(),
  bounds: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
});
export type GetViewportResult = z.infer<typeof GetViewportResultSchema>;

export const FontUsageSchema = z.object({
  fontName: SerializedFontNameSchema,
  count: z.number(),
});
export type FontUsage = z.infer<typeof FontUsageSchema>;

export const GetFontsResultSchema = z.object({
  fonts: z.array(FontUsageSchema),
  variationAxes: z.record(z.string(), z.array(z.string())).optional(),
});
export type GetFontsResult = z.infer<typeof GetFontsResultSchema>;

export const NodeAnnotationsSchema = z.object({
  nodeId: z.string(),
  nodeName: z.string(),
  annotations: z.array(SerializedAnnotationSchema),
});
export type NodeAnnotations = z.infer<typeof NodeAnnotationsSchema>;

export const GetAnnotationsResultSchema = z.object({
  annotations: z.array(NodeAnnotationsSchema),
});
export type GetAnnotationsResult = z.infer<typeof GetAnnotationsResultSchema>;
