import { z } from 'zod';

import { colorSpaceSchema } from '../shared/color-space-schema.js';
import { variableEasingSchema } from '../shared/motion-easing-schema.js';
import type { ToolSpec } from '../tool-spec.js';

export const SET_VARIABLE_VALUE_TOOL_NAME = 'set_variable_value';

const variableValue = z
  .union([
    z.boolean(),
    z.number(),
    z.string(),
    z.looseObject({
      r: z.number(),
      g: z.number(),
      b: z.number(),
      a: z.number().optional(),
      space: colorSpaceSchema.optional(),
    }),
    z.looseObject({ type: z.literal('VARIABLE_ALIAS'), id: z.string() }),
    z.looseObject({
      color: z.union([
        z.looseObject({
          r: z.number(),
          g: z.number(),
          b: z.number(),
          a: z.number().optional(),
          space: colorSpaceSchema.optional(),
        }),
        z.looseObject({ type: z.literal('VARIABLE_ALIAS'), id: z.string() }),
      ]),
      opacity: z.union([
        z.number(),
        z.looseObject({ type: z.literal('VARIABLE_ALIAS'), id: z.string() }),
      ]),
    }),
    variableEasingSchema,
  ])
  .describe(
    'boolean | number | string | { r,g,b,a, space? } | { type:"VARIABLE_ALIAS", id } | ' +
      '{ color, opacity: 0–100 } composed color | { type: easing }',
  );

export const setVariableValueParams = z.object({
  variableId: z.string().describe('Variable id'),
  modeId: z.string().describe('Mode id (from the collection)'),
  value: variableValue,
});

export const setVariableValueTool: ToolSpec = {
  name: SET_VARIABLE_VALUE_TOOL_NAME,
  description:
    "Set a variable's value for one mode (modeId comes from the variable's collection). value must " +
    'match the variable resolvedType: a boolean, a number (FLOAT), a string, a color { r, g, b, a } ' +
    '(0–1, in the document\'s colour space unless `space` names another — pass "SRGB" for a ' +
    'colour taken from code), an alias { type: "VARIABLE_ALIAS", id } pointing at another ' +
    'variable, or a composed color { color, opacity } that pairs a color with a separate opacity ' +
    '— a percentage, 0–100 (50 is half), unlike the 0–1 colour channels — ' +
    'each half either a ' +
    'concrete value or an alias, with at least one of the two an alias. An EASING variable takes a ' +
    'Motion easing, a TIMING variable a number of seconds. Create the variable first with ' +
    'create_variable. Returns { ok, variableId, name }.',
  inputSchema: setVariableValueParams,
  kind: 'write',
};
