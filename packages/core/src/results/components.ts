import { z } from 'zod';

export const SerializedComponentInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string(),
  parentId: z.string().nullable(),
  variantProperties: z.record(z.string(), z.string()).optional(),
});
export type SerializedComponentInfo = z.infer<typeof SerializedComponentInfoSchema>;

export const SerializedComponentSetInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string(),
  variantGroupProperties: z
    .record(z.string(), z.object({ values: z.array(z.string()) }))
    .optional(),
  componentIds: z.array(z.string()),
});
export type SerializedComponentSetInfo = z.infer<typeof SerializedComponentSetInfoSchema>;

export const GetLocalComponentsResultSchema = z.object({
  components: z.array(SerializedComponentInfoSchema),
  componentSets: z.array(SerializedComponentSetInfoSchema),
});
export type GetLocalComponentsResult = z.infer<typeof GetLocalComponentsResultSchema>;

export const ComponentPropertyApiEntrySchema = z.object({
  type: z.enum(['BOOLEAN', 'TEXT', 'INSTANCE_SWAP', 'VARIANT', 'SLOT']),
  defaultValue: z.union([z.string(), z.boolean()]),
  variantOptions: z.array(z.string()).optional(),
  preferredValues: z
    .array(z.object({ type: z.enum(['COMPONENT', 'COMPONENT_SET']), key: z.string() }))
    .optional(),
  description: z.string().optional(),
});
export type ComponentPropertyApiEntry = z.infer<typeof ComponentPropertyApiEntrySchema>;

export const GetComponentApiResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  properties: z.record(z.string(), ComponentPropertyApiEntrySchema),
});
export type GetComponentApiResult = z.infer<typeof GetComponentApiResultSchema>;
