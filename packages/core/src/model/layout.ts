import { z } from 'zod';

import { SerializedBindingsSchema } from './primitives.js';

export const SerializedLayoutGridSchema = z.object({
  pattern: z.string(),
  visible: z.boolean(),
  sectionSize: z.number().optional(),
  count: z.number().optional(),
  gutterSize: z.number().optional(),
  alignment: z.string().optional(),
  offset: z.number().optional(),
  boundVariables: SerializedBindingsSchema.optional(),
});
export type SerializedLayoutGrid = z.infer<typeof SerializedLayoutGridSchema>;

export const SerializedGridTrackSchema = z.object({ type: z.string(), value: z.number() });
export type SerializedGridTrack = z.infer<typeof SerializedGridTrackSchema>;

export const SerializedAutoLayoutSchema = z.object({
  mode: z.enum(['HORIZONTAL', 'VERTICAL', 'GRID']),
  paddingTop: z.number(),
  paddingRight: z.number(),
  paddingBottom: z.number(),
  paddingLeft: z.number(),
  itemSpacing: z.number().optional(),
  primaryAxisAlignItems: z.string().optional(),
  counterAxisAlignItems: z.string().optional(),
  layoutWrap: z.string().optional(),
  counterAxisSpacing: z.number().optional(),
  counterAxisAlignContent: z.string().optional(),
  itemReverseZIndex: z.boolean().optional(),
  strokesIncludedInLayout: z.boolean().optional(),
  gridRowCount: z.number().optional(),
  gridColumnCount: z.number().optional(),
  gridItemsPositioning: z.enum(['MANUAL', 'ROW_AUTO_FLOW']).optional(),
  gridAutoTracks: z.enum(['NONE', 'ROWS']).optional(),
  gridRowGap: z.number().optional(),
  gridColumnGap: z.number().optional(),
  gridRowSizes: z.array(SerializedGridTrackSchema).optional(),
  gridColumnSizes: z.array(SerializedGridTrackSchema).optional(),
});
export type SerializedAutoLayout = z.infer<typeof SerializedAutoLayoutSchema>;

export const SerializedGridChildSchema = z.object({
  rowAnchorIndex: z.number().optional(),
  columnAnchorIndex: z.number().optional(),
  rowSpan: z.number().optional(),
  columnSpan: z.number().optional(),
  horizontalAlign: z.string().optional(),
  verticalAlign: z.string().optional(),
});
export type SerializedGridChild = z.infer<typeof SerializedGridChildSchema>;

export const SerializedConstraintsSchema = z.object({
  horizontal: z.string(),
  vertical: z.string(),
});
export type SerializedConstraints = z.infer<typeof SerializedConstraintsSchema>;
