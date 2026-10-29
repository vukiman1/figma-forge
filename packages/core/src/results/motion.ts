import { z } from 'zod';

export const MotionStyleSchema = z.object({
  styleId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  props: z.record(z.string(), z.string()).optional(),
});
export type MotionStyle = z.infer<typeof MotionStyleSchema>;

export const GetMotionStylesResultSchema = z.object({ styles: z.array(MotionStyleSchema) });
export type GetMotionStylesResult = z.infer<typeof GetMotionStylesResultSchema>;

export const TimelineSchema = z.looseObject({ id: z.string(), duration: z.number() });
export type Timeline = z.infer<typeof TimelineSchema>;

export const NodeMotionSchema = z.object({
  animationStyles: z.array(z.unknown()),
  animations: z.record(z.string(), z.unknown()),
  manualKeyframeTracks: z.record(z.string(), z.unknown()),
  timelines: z.array(TimelineSchema),
});
export type NodeMotion = z.infer<typeof NodeMotionSchema>;

export const GetNodeMotionResultSchema = z.object({
  nodeId: z.string(),
  motion: NodeMotionSchema.nullable(),
  playheadPosition: z.number().optional(),
});
export type GetNodeMotionResult = z.infer<typeof GetNodeMotionResultSchema>;

export const MotionContextNodeSchema = z.object({
  nodeId: z.string(),
  parentId: z.string().nullable(),
  name: z.string(),
  type: z.string(),
  motion: NodeMotionSchema,
});
export type MotionContextNode = z.infer<typeof MotionContextNodeSchema>;

export const MotionDiagnosticSchema = z.object({
  nodeId: z.string(),
  code: z.enum(['read-error', 'node-over-budget']),
  message: z.string(),
});
export type MotionDiagnostic = z.infer<typeof MotionDiagnosticSchema>;

export const MotionCoverageSchema = z.object({
  status: z.enum(['complete', 'partial']),
  visitedNodes: z.number(),
  animatedNodes: z.number(),
  reasons: z.array(z.enum(['node-limit', 'payload-limit', 'read-error'])).optional(),
  pendingNodeIds: z.array(z.string()).optional(),
  pendingOmitted: z.number().optional(),
});
export type MotionCoverage = z.infer<typeof MotionCoverageSchema>;

export const GetMotionContextResultSchema = z.object({
  rootNodeId: z.string(),
  coverage: MotionCoverageSchema,
  diagnostics: z.array(MotionDiagnosticSchema).optional(),
  diagnosticsOmitted: z.number().optional(),
  nodes: z.array(MotionContextNodeSchema),
});
export type GetMotionContextResult = z.infer<typeof GetMotionContextResultSchema>;
