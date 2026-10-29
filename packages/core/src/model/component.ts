import { z } from 'zod';

export const SerializedComponentPropertySchema = z.object({
  type: z.string(),
  value: z.union([z.string(), z.boolean()]),
});
export type SerializedComponentProperty = z.infer<typeof SerializedComponentPropertySchema>;

export const SerializedMainComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  componentSetId: z.string().optional(),
  componentSetName: z.string().optional(),
});
export type SerializedMainComponent = z.infer<typeof SerializedMainComponentSchema>;

export const SerializedAnnotationSchema = z.object({
  label: z.string().optional(),
  labelMarkdown: z.string().optional(),
  categoryId: z.string().optional(),
  properties: z.array(z.string()).optional(),
});
export type SerializedAnnotation = z.infer<typeof SerializedAnnotationSchema>;
