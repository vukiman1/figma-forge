import type { GridInput } from '@figma-forge/core';

import { boundIdsOf, resolveVariables, variableFor } from '../variables/resolve-variables.js';
import { toFigmaLayoutGrid } from './to-figma-layout-grid.js';

export const toFigmaLayoutGridsBound = async (
  figmaCtx: typeof figma,
  grids: readonly GridInput[],
  where: string,
): Promise<LayoutGrid[]> => {
  const table = await resolveVariables(figmaCtx, boundIdsOf(grids), where);
  return grids.map(source =>
    Object.entries(source.boundVariables ?? {}).reduce(
      (grid, [field, id]) =>
        figmaCtx.variables.setBoundVariableForLayoutGrid(
          grid,
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Figma validates the field name and rejects unknown ones
          field as VariableBindableLayoutGridField,
          variableFor(table, id),
        ),
      toFigmaLayoutGrid(source),
    ),
  );
};
