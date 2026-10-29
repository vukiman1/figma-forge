import { z } from 'zod';

import { textStyleBindingsSchema } from '../shared/binding-schema.js';
import { fontNameSchema } from '../shared/font-name-schema.js';
import { letterSpacingSchema, lineHeightSchema } from '../shared/text-metrics-schema.js';
import type { ToolSpec } from '../tool-spec.js';

export const UPDATE_TEXT_STYLE_TOOL_NAME = 'update_text_style';

export const updateTextStyleParams = z.object({
  styleId: z.string().describe('Text style id to update'),
  name: z.string().optional(),
  fontName: fontNameSchema.optional(),
  fontSize: z.number().optional(),
  lineHeight: lineHeightSchema.optional(),
  letterSpacing: letterSpacingSchema.optional(),
  textWrapStyle: z
    .enum(['AUTO', 'BALANCE', 'PRETTY'])
    .optional()
    .describe(
      'Line-break balancing every node bound to this style inherits; maps 1:1 to CSS text-wrap',
    ),
  boundVariables: textStyleBindingsSchema.optional(),
  description: z.string().optional(),
});

export const updateTextStyleTool: ToolSpec = {
  name: UPDATE_TEXT_STYLE_TOOL_NAME,
  description:
    'Update an existing text style (typography token) by id. Any of name / fontName / fontSize / ' +
    'lineHeight / letterSpacing / textWrapStyle / description may be omitted to leave unchanged. A new font is ' +
    'loaded before assignment. lineHeight unit is AUTO / PIXELS / PERCENT (AUTO omits value); ' +
    'letterSpacing unit is PIXELS / PERCENT. Use this to keep a shared style in sync with code ' +
    'instead of creating a duplicate. Returns { ok, styleId, name }.',
  inputSchema: updateTextStyleParams,
  kind: 'write',
};
