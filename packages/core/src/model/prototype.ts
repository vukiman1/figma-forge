import { z } from 'zod';

export const SerializedTriggerSchema = z.looseObject({
  type: z.string(),
  timeout: z.number().optional(),
  delay: z.number().optional(),
  deprecatedVersion: z.boolean().optional(),
  device: z.string().optional(),
  keyCodes: z.array(z.number()).optional(),
  mediaHitTime: z.number().optional(),
});
export type SerializedTrigger = z.infer<typeof SerializedTriggerSchema>;

export const SerializedEasingSchema = z.looseObject({
  type: z.string(),
  easingFunctionCubicBezier: z
    .looseObject({
      x1: z.number().optional(),
      y1: z.number().optional(),
      x2: z.number().optional(),
      y2: z.number().optional(),
    })
    .optional(),
  easingFunctionSpring: z
    .looseObject({
      mass: z.number().optional(),
      stiffness: z.number().optional(),
      damping: z.number().optional(),
      initialVelocity: z.number().optional(),
    })
    .optional(),
});
export type SerializedEasing = z.infer<typeof SerializedEasingSchema>;

export const SerializedTransitionSchema = z.looseObject({
  type: z.string(),
  duration: z.number().optional(),
  easing: SerializedEasingSchema.optional(),
  direction: z.string().optional(),
  matchLayers: z.boolean().optional(),
});
export type SerializedTransition = z.infer<typeof SerializedTransitionSchema>;

export const SerializedVariableDataSchema = z.looseObject({
  type: z.string().optional(),
  resolvedType: z.string().optional(),
  value: z.union([z.boolean(), z.number(), z.string(), z.looseObject({})]).optional(),
});
export type SerializedVariableData = z.infer<typeof SerializedVariableDataSchema>;

export const SerializedActionSchema = z.looseObject({
  type: z.string(),
  destinationId: z.string().nullable().optional(),
  navigation: z.string().optional(),
  transition: SerializedTransitionSchema.nullable().optional(),
  overlayRelativePosition: z
    .looseObject({ x: z.number().optional(), y: z.number().optional() })
    .optional(),
  preserveScrollPosition: z.boolean().optional(),
  resetVideoPosition: z.boolean().optional(),
  resetScrollPosition: z.boolean().optional(),
  resetInteractiveComponents: z.boolean().optional(),
  url: z.string().optional(),
  openInNewTab: z.boolean().optional(),
  mediaAction: z.string().optional(),
  amountToSkip: z.number().optional(),
  newTimestamp: z.number().optional(),
  variableId: z.string().nullable().optional(),
  variableValue: SerializedVariableDataSchema.optional(),
  variableCollectionId: z.string().nullable().optional(),
  variableModeId: z.string().nullable().optional(),
  conditionalBlocks: z
    .array(
      z.looseObject({
        condition: SerializedVariableDataSchema.optional(),
        actions: z.array(z.looseObject({ type: z.string().optional() })).optional(),
      }),
    )
    .optional(),
});
export type SerializedAction = z.infer<typeof SerializedActionSchema>;

export const SerializedReactionSchema = z.looseObject({
  trigger: SerializedTriggerSchema.nullable(),
  actions: z.array(SerializedActionSchema),
});
export type SerializedReaction = z.infer<typeof SerializedReactionSchema>;

export const GetReactionsResultSchema = z.object({
  nodeId: z.string(),
  reactions: z.array(SerializedReactionSchema),
});
export type GetReactionsResult = z.infer<typeof GetReactionsResultSchema>;
