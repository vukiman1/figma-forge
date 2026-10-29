import { z } from 'zod';

export const SerializedComplexStrokeSchema = z.object({
  type: z.enum(['BRUSH', 'DYNAMIC']),
  brushType: z.enum(['STRETCH', 'SCATTER']).optional(),
  brushName: z.string().optional(),
  direction: z.enum(['FORWARD', 'BACKWARD']).optional(),
  gap: z.number().optional(),
  wiggle: z.number().optional(),
  sizeJitter: z.number().optional(),
  angularJitter: z.number().optional(),
  rotation: z.number().optional(),
  frequency: z.number().optional(),
  smoothen: z.number().optional(),
});
export type SerializedComplexStroke = z.infer<typeof SerializedComplexStrokeSchema>;

export const SerializedVariableWidthStrokeSchema = z.object({
  widthProfile: z.string(),
  variableWidthPoints: z.array(z.object({ position: z.number(), width: z.number() })),
});
export type SerializedVariableWidthStroke = z.infer<typeof SerializedVariableWidthStrokeSchema>;

export const SerializedTransformModifierSchema = z.object({
  type: z.string(),
  repeatType: z.enum(['LINEAR', 'RADIAL']).optional(),
  axis: z.enum(['HORIZONTAL', 'VERTICAL']).optional(),
  unitType: z.enum(['RELATIVE', 'PIXELS']).optional(),
  offset: z.number().optional(),
  count: z.number().optional(),
});
export type SerializedTransformModifier = z.infer<typeof SerializedTransformModifierSchema>;
