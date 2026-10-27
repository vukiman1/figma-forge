import { z } from 'zod';

import { textStyleBindingsSchema } from '../shared/binding-schema.js';
import { fontNameSchema } from '../shared/font-name-schema.js';
import { letterSpacingSchema, lineHeightSchema } from '../shared/text-metrics-schema.js';
import type { ToolSpec } from '../tool-spec.js';

export const CREATE_TEXT_STYLE_TOOL_NAME = 'create_text_style';

export const createTextStyleParams = z.object({
  name: z.string().describe('Style name, e.g. "Heading/H1"'),
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

export const createTextStyleTool: ToolSpec = {
  name: CREATE_TEXT_STYLE_TOOL_NAME,
  description:
    'Create a reusable local text style (a typography token) that can be applied to TEXT nodes with ' +
    'apply_style_to_node. The font is loaded before assignment. lineHeight unit is AUTO / PIXELS / ' +
    'PERCENT (AUTO omits value); letterSpacing unit is PIXELS / PERCENT; textWrapStyle is the wrap ' +
    'balancing (CSS text-wrap) every bound node inherits. For one-off formatting of a ' +
    'single node use set_text_properties instead. Returns { ok, styleId, name }.',
  inputSchema: createTextStyleParams,
  kind: 'write',
};
