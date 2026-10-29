import { z } from 'zod';

import { DisplayP3MarkerSchema } from '../model/primitives.js';
import { ResolvedTokenSchema } from '../model/resolved-token.js';
import { DesignContextNodeSchema } from './node.js';

export const GlobalVarsSchema = z.object({ styles: z.record(z.string(), z.unknown()) });
export type GlobalVars = z.infer<typeof GlobalVarsSchema>;

export const DesignContextMetricsSchema = z.object({
  nodeCount: z.number(),
  maxDepth: z.number(),
  styleCount: z.number(),
  tokenCount: z.number(),
  inlineSizeKb: z.number(),
  dedupedSizeKb: z.number(),
});
export type DesignContextMetrics = z.infer<typeof DesignContextMetricsSchema>;

export const DesignContextSectionSchema = z.object({
  nodeId: z.string(),
  name: z.string(),
  type: z.string(),
  childCount: z.number(),
  nodes: z.number(),
});
export type DesignContextSection = z.infer<typeof DesignContextSectionSchema>;

export const DesignContextSectionPlanSchema = z.object({
  reason: z.enum(['node-count', 'payload-size']),
  totalNodes: z.number().optional(),
  payloadChars: z.number().optional(),
  sections: z.array(DesignContextSectionSchema),
  sectionsOmitted: z.number().optional(),
});
export type DesignContextSectionPlan = z.infer<typeof DesignContextSectionPlanSchema>;

export const ProjectTokenMatchSchema = z.object({
  ref: z.string(),
  name: z.string(),
  from: z.string().optional(),
});
export type ProjectTokenMatch = z.infer<typeof ProjectTokenMatchSchema>;

const MATCHED_BY_VALUE = z.tuple([z.literal('value')]);

export const ProjectTokenAnnotationSchema = z.union([
  ProjectTokenMatchSchema.extend({ matchedBy: MATCHED_BY_VALUE }),
  z.object({ matchedBy: MATCHED_BY_VALUE, candidates: z.array(ProjectTokenMatchSchema) }),
]);
export type ProjectTokenAnnotation = z.infer<typeof ProjectTokenAnnotationSchema>;

export const GetDesignContextResultSchema = z.object({
  nodes: z.array(DesignContextNodeSchema),
  hint: z.string().optional(),
  sectionPlan: DesignContextSectionPlanSchema.optional(),
  note: z.string().optional(),
  globalVars: GlobalVarsSchema.optional(),
  variables: z.record(z.string(), ResolvedTokenSchema).optional(),
  styles: z.record(z.string(), ResolvedTokenSchema).optional(),
  projectTokens: z.record(z.string(), ProjectTokenAnnotationSchema).optional(),
  metrics: DesignContextMetricsSchema.optional(),
  colorProfile: DisplayP3MarkerSchema.optional(),
});
export type GetDesignContextResult = z.infer<typeof GetDesignContextResultSchema>;
