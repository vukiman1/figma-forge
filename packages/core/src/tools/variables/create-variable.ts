import { z } from 'zod';

import type { ToolSpec } from '../tool-spec.js';

export const CREATE_VARIABLE_TOOL_NAME = 'create_variable';

const VARIABLE_SCOPES = [
  'ALL_SCOPES',
  'TEXT_CONTENT',
  'CORNER_RADIUS',
  'WIDTH_HEIGHT',
  'GAP',
  'ALL_FILLS',
  'FRAME_FILL',
  'SHAPE_FILL',
  'TEXT_FILL',
  'STROKE_COLOR',
  'STROKE_FLOAT',
  'EFFECT_FLOAT',
  'EFFECT_COLOR',
  'OPACITY',
  'COLOR_OPACITY',
  'FONT_FAMILY',
  'FONT_STYLE',
  'FONT_WEIGHT',
  'FONT_SIZE',
  'LINE_HEIGHT',
  'LETTER_SPACING',
  'PARAGRAPH_SPACING',
  'PARAGRAPH_INDENT',
] as const;

export const createVariableTool: ToolSpec = {
  name: CREATE_VARIABLE_TOOL_NAME,
  description:
    'Create a variable in a collection with resolvedType BOOLEAN / FLOAT / STRING / COLOR / EASING ' +
    '/ TIMING. Set per-mode values with set_variable_value, then attach it with ' +
    'bind_variable_to_node or bind_variable_to_paint — or, for EASING (a Motion curve) and TIMING ' +
    '(seconds), as a { type: "VARIABLE_ALIAS", id } in a Motion easing or a preset\'s delay / ' +
    'duration. Optionally pass ' +
    'scopes to narrow where Figma offers the variable in its picker (a radius token scoped to ' +
    'CORNER_RADIUS stops being suggested for width or gap); omit it to leave the variable in every ' +
    "scope, which is Figma's default. Returns { ok, variableId, name }.",
  inputSchema: z.object({
    name: z.string().describe('Variable name, e.g. "color/primary"'),
    collectionId: z.string().describe('Variable collection id'),
    resolvedType: z
      .enum(['BOOLEAN', 'FLOAT', 'STRING', 'COLOR', 'EASING', 'TIMING'])
      .describe('Variable data type'),
    scopes: z
      .array(z.enum(VARIABLE_SCOPES))
      .nonempty()
      .optional()
      .describe(
        'Where Figma offers this variable in its picker, e.g. ["CORNER_RADIUS"] or ' +
          '["FRAME_FILL","SHAPE_FILL"]. Omit for all scopes. Not available for EASING / TIMING.',
      ),
  }),
  kind: 'write',
};
