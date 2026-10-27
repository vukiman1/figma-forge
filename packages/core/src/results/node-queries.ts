import { z } from 'zod';

import { SerializedNodeSchema } from '../model/serialized-node.js';

export const GetSelectionResultSchema = z.object({
  pageId: z.string(),
  pageName: z.string(),
  nodes: z.array(SerializedNodeSchema),
});
export type GetSelectionResult = z.infer<typeof GetSelectionResultSchema>;

export const GetDocumentResultSchema = z.object({
  pageId: z.string(),
  pageName: z.string(),
  children: z.array(SerializedNodeSchema),
});
export type GetDocumentResult = z.infer<typeof GetDocumentResultSchema>;

export const PageRefSchema = z.object({ id: z.string(), name: z.string() });
export type PageRef = z.infer<typeof PageRefSchema>;

export const GetNodeResultSchema = z.object({ node: SerializedNodeSchema.nullable() });
export type GetNodeResult = z.infer<typeof GetNodeResultSchema>;

export const GetNodesInfoResultSchema = z.object({
  nodes: z.array(SerializedNodeSchema.nullable()),
});
export type GetNodesInfoResult = z.infer<typeof GetNodesInfoResultSchema>;

export const GetMetadataResultSchema = z.object({
  fileName: z.string(),
  currentPage: PageRefSchema,
  pages: z.array(PageRefSchema),
  editorType: z.string(),
  colorProfile: z.string().optional(),
  mode: z.string(),
});
export type GetMetadataResult = z.infer<typeof GetMetadataResultSchema>;

export const FlowStartingPointSchema = z.object({ nodeId: z.string(), name: z.string() });
export type FlowStartingPoint = z.infer<typeof FlowStartingPointSchema>;

export const GetPagesResultSchema = z.object({
  pages: z.array(PageRefSchema.extend({ flows: z.array(FlowStartingPointSchema) })),
});
export type GetPagesResult = z.infer<typeof GetPagesResultSchema>;

export const NodeListResultSchema = z.object({
  note: z.string().optional(),
  matchCount: z.number().int().nonnegative().optional(),
  nodes: z.array(SerializedNodeSchema),
});
export type SearchNodesResult = z.infer<typeof NodeListResultSchema>;
export type ScanTextNodesResult = z.infer<typeof NodeListResultSchema>;
export type ScanNodesByTypesResult = z.infer<typeof NodeListResultSchema>;
