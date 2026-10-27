import { z } from 'zod';

import { FlowStartingPointSchema } from './node-queries.js';

export const MutateResultSchema = z.object({
  ok: z.literal(true),
  nodeId: z.string(),
});
export type MutateResult = z.infer<typeof MutateResultSchema>;

export const ApplyAnimationStyleResultSchema = z.object({
  ok: z.literal(true),
  nodeId: z.string(),
  appliedStyleId: z.string(),
});
export type ApplyAnimationStyleResult = z.infer<typeof ApplyAnimationStyleResultSchema>;

export const CreateResultSchema = z.object({
  ok: z.literal(true),
  nodeId: z.string(),
  name: z.string(),
  type: z.string(),
});
export type CreateResult = z.infer<typeof CreateResultSchema>;

export const ImageFillResultSchema = z.object({
  ok: z.literal(true),
  nodeId: z.string(),
  index: z.number(),
  imageHash: z.string(),
  width: z.number(),
  height: z.number(),
});
export type ImageFillResult = z.infer<typeof ImageFillResultSchema>;

export const BatchNodeResultSchema = z.object({
  ok: z.literal(true),
  affected: z.array(z.string()),
});
export type BatchNodeResult = z.infer<typeof BatchNodeResultSchema>;

export const ResizeNodesResultSchema = BatchNodeResultSchema.extend({
  adjusted: z
    .array(
      z.object({
        nodeId: z.string(),
        width: z.number(),
        height: z.number(),
        reason: z.string(),
      }),
    )
    .optional(),
});
export type ResizeNodesResult = z.infer<typeof ResizeNodesResultSchema>;

export const StyleResultSchema = z.object({
  ok: z.literal(true),
  styleId: z.string(),
  name: z.string(),
});
export type StyleResult = z.infer<typeof StyleResultSchema>;

export const CollectionResultSchema = z.object({
  ok: z.literal(true),
  collectionId: z.string(),
  defaultModeId: z.string(),
  name: z.string(),
});
export type CollectionResult = z.infer<typeof CollectionResultSchema>;

export const DeleteCollectionResultSchema = z.object({
  ok: z.literal(true),
  collectionId: z.string(),
  name: z.string(),
});
export type DeleteCollectionResult = z.infer<typeof DeleteCollectionResultSchema>;

export const ModeResultSchema = z.object({
  ok: z.literal(true),
  modeId: z.string(),
  name: z.string(),
});
export type ModeResult = z.infer<typeof ModeResultSchema>;

export const UpdateCollectionResultSchema = z.object({
  ok: z.literal(true),
  collectionId: z.string(),
  name: z.string(),
  modes: z.array(z.object({ modeId: z.string(), name: z.string() })),
});
export type UpdateCollectionResult = z.infer<typeof UpdateCollectionResultSchema>;

export const DeleteModeResultSchema = z.object({
  ok: z.literal(true),
  collectionId: z.string(),
  modeId: z.string(),
  name: z.string(),
});
export type DeleteModeResult = z.infer<typeof DeleteModeResultSchema>;

export const UpdateFlowsResultSchema = z.object({
  ok: z.literal(true),
  pageId: z.string(),
  flows: z.array(FlowStartingPointSchema),
});
export type UpdateFlowsResult = z.infer<typeof UpdateFlowsResultSchema>;

export const VariableResultSchema = z.object({
  ok: z.literal(true),
  variableId: z.string(),
  name: z.string(),
  codeSyntax: z.record(z.string(), z.string()).optional(),
});
export type VariableResult = z.infer<typeof VariableResultSchema>;

export const VariableModeResultSchema = z.object({
  ok: z.literal(true),
  nodeId: z.string(),
  collectionId: z.string(),
  collectionName: z.string(),
  modeId: z.string().nullable(),
  modeName: z.string().nullable(),
});
export type VariableModeResult = z.infer<typeof VariableModeResultSchema>;

export const ComponentPropertyResultSchema = z.object({
  ok: z.literal(true),
  componentId: z.string(),
  propertyId: z.string(),
  name: z.string(),
});
export type ComponentPropertyResult = z.infer<typeof ComponentPropertyResultSchema>;

export const BatchOpSchema = z.object({
  tool: z.string(),
  params: z.unknown().optional(),
});
export type BatchOp = z.infer<typeof BatchOpSchema>;

export const BatchResultSchema = z.object({
  ok: z.literal(true),
  results: z.array(z.unknown()),
});
export type BatchResult = z.infer<typeof BatchResultSchema>;
