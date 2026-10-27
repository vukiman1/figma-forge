import { z } from 'zod';

import { SerializedVariableAliasSchema } from '../../model/primitives.js';
import { motionEasingSchema } from './motion-easing-schema.js';

const rgba = z
  .object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
    a: z.number().min(0).max(1),
  })
  .describe(
    "Color as RGBA channels 0–1, in the document's colour space (a keyframe colour takes no `space`)",
  );

export const keyframeValueSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('FLOAT'), value: z.number() }),
    z.object({ type: z.literal('COLOR'), value: rgba }),
    z.object({ type: z.literal('TEXT_DATA'), value: z.string() }),
    z.object({ type: z.literal('VECTOR'), value: z.object({ x: z.number(), y: z.number() }) }),
    z.object({ type: z.literal('BOOL'), value: z.boolean() }),
    z.object({
      type: z.literal('CIRCLE'),
      value: z.object({ x: z.number(), y: z.number(), radius: z.number() }),
    }),
    z.object({
      type: z.literal('LINE'),
      value: z.object({ x: z.number(), y: z.number(), x2: z.number(), y2: z.number() }),
    }),
    z.object({
      type: z.literal('CIRCLE_POINT'),
      value: z.object({ x: z.number(), y: z.number(), radius: z.number(), angle: z.number() }),
    }),
    z.object({
      type: z.literal('COLOR_POINT'),
      value: z.object({ x: z.number(), y: z.number(), color: rgba }),
    }),
  ])
  .describe(
    'A keyframe value tagged by its animated field type (FLOAT for translate/scale/opacity, …)',
  );

export const motionAliasSchema = SerializedVariableAliasSchema.describe(
  'Bind to a variable: an EASING variable for an easing, a TIMING variable (seconds) for a ' +
    'delay / duration prop',
);

export const manualKeyframeInputSchema = z.object({
  id: z.string().optional(),
  timelinePosition: z.number().describe('Keyframe position on the timeline, in seconds'),
  easing: z
    .union([motionAliasSchema, motionEasingSchema])
    .describe(
      'Easing of the segment arriving at this keyframe: a literal easing, or an EASING variable ' +
        'alias { type: "VARIABLE_ALIAS", id }',
    )
    .optional(),
  value: keyframeValueSchema,
});

export const manualKeyframeTrackInputSchema = z.object({
  id: z.string().optional(),
  baseValue: keyframeValueSchema.describe('The value before the first keyframe').optional(),
  keyframes: z.array(manualKeyframeInputSchema).min(1).describe('Keyframes in timeline order'),
});

export const KEYFRAME_PROPERTY_FIELDS = [
  'CORNER_RADIUS',
  'STROKE_WEIGHT',
  'STACK_SPACING',
  'STACK_PADDING_LEFT',
  'STACK_PADDING_TOP',
  'STACK_PADDING_RIGHT',
  'STACK_PADDING_BOTTOM',
  'WIDTH',
  'HEIGHT',
  'RECTANGLE_TOP_LEFT_CORNER_RADIUS',
  'RECTANGLE_TOP_RIGHT_CORNER_RADIUS',
  'RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS',
  'RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS',
  'BORDER_TOP_WEIGHT',
  'BORDER_BOTTOM_WEIGHT',
  'BORDER_LEFT_WEIGHT',
  'BORDER_RIGHT_WEIGHT',
  'STACK_COUNTER_SPACING',
  'OPACITY',
  'GRID_ROW_GAP',
  'GRID_COLUMN_GAP',
  'TRANSLATION_X',
  'TRANSLATION_Y',
  'TRANSLATION_XY',
  'ROTATION',
  'SCALE_X',
  'SCALE_Y',
  'SCALE_XY',
  'PATH_TRIM_START',
  'PATH_TRIM_END',
] as const;

export const EFFECT_KEYFRAME_FIELDS = [
  'OFFSET_X',
  'OFFSET_Y',
  'RADIUS',
  'SPREAD',
  'COLOR',
  'REFRACTION_RADIUS',
  'SPECULAR_ANGLE',
  'SPECULAR_INTENSITY',
  'CHROMATIC_ABERRATION',
  'SPLAY',
  'REFRACTION_INTENSITY',
  'START_RADIUS',
  'NOISE_SIZE_X',
  'NOISE_SIZE_Y',
  'DENSITY',
  'EFFECT_OPACITY',
  'SECONDARY_COLOR',
] as const;

export const keyframeFieldSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('PROPERTY'), name: z.enum(KEYFRAME_PROPERTY_FIELDS) }),
    z.object({
      type: z.literal('INDEXED_ITEM'),
      collection: z.enum(['fills', 'strokes', 'effects']),
      index: z.number().int().min(0),
      field: z
        .enum(EFFECT_KEYFRAME_FIELDS)
        .describe('Effect sub-field to animate; only when collection is "effects"')
        .optional(),
      propertyId: z
        .string()
        .describe('Animate a bound component-property on the paint/effect instead of a field')
        .optional(),
    }),
  ])
  .describe(
    'Which field a keyframe track drives: a node PROPERTY or an INDEXED_ITEM in fills/strokes/effects',
  );
