import { z } from 'zod';

import { setAutoLayoutTool } from '../layout/set-auto-layout.js';
import { fillPaintItemSchema } from '../shared/paint-schema.js';
import { setTextPropertiesTool } from '../text/set-text-properties.js';

export const initialStyleShape = {
  fills: z
    .array(fillPaintItemSchema)
    .optional()
    .describe('Fills to apply on creation (as set_fills)'),
  strokes: z
    .array(fillPaintItemSchema)
    .optional()
    .describe('Stroke paints to apply on creation (as set_strokes)'),
  strokeWeight: z.number().min(0).optional().describe('Uniform stroke thickness in px'),
  strokeAlign: z
    .enum(['INSIDE', 'OUTSIDE', 'CENTER'])
    .optional()
    .describe('Stroke position relative to the geometry'),
  layoutSizingHorizontal: z
    .enum(['FIXED', 'HUG', 'FILL'])
    .optional()
    .describe('Horizontal sizing (as set_layout_props); FILL needs an auto-layout parent'),
  layoutSizingVertical: z
    .enum(['FIXED', 'HUG', 'FILL'])
    .optional()
    .describe('Vertical sizing (as set_layout_props); FILL needs an auto-layout parent'),
};

export const initialRadiusShape = {
  cornerRadius: z.number().min(0).optional().describe('Uniform corner radius in px'),
};

export const initialFrameShape = {
  autoLayout: setAutoLayoutTool.inputSchema
    .omit({ nodeId: true })
    .optional()
    .describe(
      'Auto layout to enable on creation — the same fields as set_auto_layout (layoutMode, ' +
        'padding*, itemSpacing, primaryAxisAlignItems, counterAxisAlignItems, …)',
    ),
  clipsContent: z.boolean().optional().describe('Clip children to the frame bounds'),
};

export const initialTextShape = setTextPropertiesTool.inputSchema.omit({ nodeId: true }).shape;
