import { z } from 'zod';

import { boundVariablesSchema } from '../shared/binding-schema.js';

export const gridItemSchema = z
  .object({
    pattern: z.enum(['GRID', 'ROWS', 'COLUMNS']),
    visible: z.boolean(),
    sectionSize: z
      .number()
      .optional()
      .describe('Cell size for GRID; section size for ROWS/COLUMNS (ignored when STRETCH)'),
    count: z.number().optional().describe('Number of columns/rows (ROWS/COLUMNS)'),
    gutterSize: z.number().optional().describe('Gap between columns/rows (ROWS/COLUMNS)'),
    alignment: z.enum(['MIN', 'MAX', 'CENTER', 'STRETCH']).optional(),
    offset: z.number().optional().describe('Page margin from the frame edge (ignored when CENTER)'),
    boundVariables: boundVariablesSchema
      .describe('Bindable fields: sectionSize / count / offset / gutterSize (FLOAT variables).')
      .optional(),
  })
  .loose();

export type GridInput = z.infer<typeof gridItemSchema>;
