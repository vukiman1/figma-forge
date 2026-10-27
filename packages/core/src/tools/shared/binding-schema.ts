import { z } from 'zod';

export const boundVariablesSchema = z
  .record(z.string(), z.string())
  .describe(
    'Variable bindings for this object as { field: variableId }, e.g. { "color": "VariableID:5:12" } ' +
      '— round-trips what get_node / get_styles report. The bound field then tracks the variable ' +
      'instead of the literal next to it. Omit to leave the value unbound: writing without it ' +
      'CLEARS any binding the object had.',
  );

export const textStyleBindingsSchema = z
  .record(z.string(), z.union([z.string(), z.null()]))
  .describe(
    'Typography bindings as { field: variableId }: fontSize / lineHeight / letterSpacing / ' +
      'paragraphSpacing / paragraphIndent take a FLOAT variable, fontFamily / fontStyle a STRING ' +
      'one, fontWeight a FLOAT. Pass null for a field to unbind it; omit a field to leave it as it ' +
      'is. A bound field wins over a literal passed for the same field in this call.',
  );
