import { z } from 'zod';

import {
  nodeAppearanceFields,
  nodeLayoutFields,
  nodeMetadataFields,
  nodeRepeatFields,
  nodeStrokeFields,
  nodeTextFields,
  nodeTransformFields,
} from '../model/node-fields.js';
import { textSegmentFields } from '../model/text.js';
import type { SimplifiedPaint } from './simplify-paint.js';

const DesignContextTextSegmentSchema = z.object({
  ...textSegmentFields,
  fills: z.array(z.custom<SimplifiedPaint>()),
});
export type DesignContextTextSegment = z.infer<typeof DesignContextTextSegmentSchema>;

const MotionSummarySchema = z.object({
  animationStyles: z.array(z.string()).optional(),
  animatedProperties: z.array(z.string()).optional(),
  timelineDuration: z.number().optional(),
});
export type MotionSummary = z.infer<typeof MotionSummarySchema>;

const PropertyOverrideSchema = z.object({
  name: z.string(),
  visible: z.boolean().optional(),
  opacity: z.number().optional(),
  cornerRadius: z.number().optional(),
  cornerRadii: z.unknown().optional(),
  cornerSmoothing: z.number().optional(),
  fills: z.array(z.unknown()).optional(),
  strokes: z.array(z.unknown()).optional(),
  strokeWeight: z.number().optional(),
  strokeAlign: z.string().optional(),
  effects: z.array(z.unknown()).optional(),
  blendMode: z.string().optional(),
  variableModes: z.record(z.string(), z.string()).optional(),
});

const styleReferenceFields = {
  fill: z.string().optional(),
  stroke: z.string().optional(),
  effect: z.string().optional(),
  textStyle: z.string().optional(),
};

const instanceFields = {
  mainComponentId: z.string().optional(),
  deduped: z.boolean().optional(),
  textOverrides: z.array(z.object({ name: z.string(), characters: z.string() })).optional(),
  propertyOverrides: z.array(PropertyOverrideSchema).optional(),
};

const DesignContextNodeBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  visible: z.boolean().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  ...nodeTransformFields,
  ...nodeAppearanceFields,
  ...nodeStrokeFields,
  ...nodeLayoutFields,
  ...nodeMetadataFields,
  ...nodeTextFields,
  segments: z.array(DesignContextTextSegmentSchema).optional(),
  ...nodeRepeatFields,
  variableModes: z.record(z.string(), z.string()).optional(),
  motion: MotionSummarySchema.optional(),
  ...styleReferenceFields,
  ...instanceFields,
  truncated: z.boolean().optional(),
});
export type DesignContextNode = z.infer<typeof DesignContextNodeBaseSchema> & {
  children?: DesignContextNode[] | undefined;
};

const childrenSchema: z.ZodType<DesignContextNode[]> = z.lazy(() =>
  z.array(DesignContextNodeSchema),
);

export const DesignContextNodeSchema = DesignContextNodeBaseSchema.extend({
  children: childrenSchema.optional(),
});
