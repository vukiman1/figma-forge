import { z } from 'zod';

import {
  SerializedAnnotationSchema,
  SerializedComponentPropertySchema,
  SerializedMainComponentSchema,
} from './component.js';
import { SerializedEffectSchema } from './effect.js';
import {
  SerializedAutoLayoutSchema,
  SerializedConstraintsSchema,
  SerializedGridChildSchema,
  SerializedLayoutGridSchema,
} from './layout.js';
import { SerializedPaintSchema } from './paint.js';
import {
  optionalOrMixed,
  SerializedBoundsSchema,
  SerializedStyleIdsSchema,
  Vector2Schema,
} from './primitives.js';
import {
  SerializedComplexStrokeSchema,
  SerializedTransformModifierSchema,
  SerializedVariableWidthStrokeSchema,
} from './stroke.js';
import {
  SerializedFontNameSchema,
  SerializedHyperlinkSchema,
  SerializedLetterSpacingSchema,
  SerializedLineHeightSchema,
  SerializedTextPathStartSchema,
} from './text.js';

export const nodeTransformFields = {
  rotation: z.number().optional(),
  flipped: z.boolean().optional(),
  cssTransform: z.string().optional(),
  boundingBox: SerializedBoundsSchema.optional(),
};

export const nodeAppearanceFields = {
  opacity: z.number().optional(),
  cornerRadius: optionalOrMixed(z.number()),
  cornerSmoothing: z.number().min(0).max(1).optional(),
  cornerRadii: z
    .object({
      topLeft: z.number(),
      topRight: z.number(),
      bottomRight: z.number(),
      bottomLeft: z.number(),
    })
    .optional(),
  blendMode: z.string().optional(),
  isMask: z.boolean().optional(),
  maskType: z.string().optional(),
  arcData: z
    .object({ startingAngle: z.number(), endingAngle: z.number(), innerRadius: z.number() })
    .optional(),
  fills: optionalOrMixed(z.array(SerializedPaintSchema)),
};

export const nodeStrokeFields = {
  strokes: z.array(SerializedPaintSchema).optional(),
  strokeWeight: optionalOrMixed(z.number()),
  strokeWeights: z
    .object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() })
    .optional(),
  strokeAlign: z.string().optional(),
  dashPattern: z.array(z.number()).optional(),
  strokeCap: z.string().optional(),
  strokeJoin: z.string().optional(),
  complexStrokeProperties: SerializedComplexStrokeSchema.optional(),
  variableWidthStrokeProperties: SerializedVariableWidthStrokeSchema.optional(),
  renderBounds: SerializedBoundsSchema.optional(),
  effects: z.array(SerializedEffectSchema).optional(),
};

export const nodeLayoutFields = {
  layout: SerializedAutoLayoutSchema.optional(),
  layoutSizingHorizontal: z.string().optional(),
  layoutSizingVertical: z.string().optional(),
  layoutGrow: z.number().optional(),
  layoutAlign: z.string().optional(),
  layoutPositioning: z.string().optional(),
  minWidth: z.number().optional(),
  maxWidth: z.number().optional(),
  minHeight: z.number().optional(),
  maxHeight: z.number().optional(),
  gridChild: SerializedGridChildSchema.optional(),
  constraints: SerializedConstraintsSchema.optional(),
  clipsContent: z.boolean().optional(),
  layoutGrids: z.array(SerializedLayoutGridSchema).optional(),
  overflowDirection: z.string().optional(),
  numberOfFixedChildren: z.number().optional(),
  targetAspectRatio: Vector2Schema.optional(),
};

export const nodeMetadataFields = {
  annotations: z.array(SerializedAnnotationSchema).optional(),
  styleIds: SerializedStyleIdsSchema.optional(),
  boundVariables: z.record(z.string(), z.array(z.string())).optional(),
  componentProperties: z.record(z.string(), SerializedComponentPropertySchema).optional(),
  mainComponent: SerializedMainComponentSchema.optional(),
  componentPropertyReferences: z
    .object({
      visible: z.string().optional(),
      characters: z.string().optional(),
      mainComponent: z.string().optional(),
    })
    .optional(),
};

export const nodeTextFields = {
  characters: z.string().optional(),
  fontSize: optionalOrMixed(z.number()),
  fontName: optionalOrMixed(SerializedFontNameSchema),
  textAlignHorizontal: z.string().optional(),
  textAlignVertical: z.string().optional(),
  lineHeight: optionalOrMixed(SerializedLineHeightSchema),
  letterSpacing: optionalOrMixed(SerializedLetterSpacingSchema),
  textCase: optionalOrMixed(z.string()),
  textDecoration: optionalOrMixed(z.string()),
  textAutoResize: z.string().optional(),
  textTruncation: z.string().optional(),
  maxLines: z.number().nullable().optional(),
  paragraphSpacing: z.number().optional(),
  paragraphIndent: z.number().optional(),
  textWrapStyle: z.string().optional(),
  hyperlink: SerializedHyperlinkSchema.optional(),
  textPathStartData: SerializedTextPathStartSchema.optional(),
};

export const nodeRepeatFields = {
  transformModifiers: z.array(SerializedTransformModifierSchema).optional(),
  repeatTransforms: z.array(z.string()).optional(),
};
