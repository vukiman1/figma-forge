export type VariableTable = ReadonlyMap<string, Variable>;

export const resolveVariables = async (
  figmaCtx: typeof figma,
  ids: readonly string[],
  where: string,
): Promise<VariableTable> => {
  const unique = [...new Set(ids)];
  const entries = await Promise.all(
    unique.map(async id => {
      const variable = await figmaCtx.variables.getVariableByIdAsync(id);
      if (variable === null) throw new Error(`${where}: variable ${id} not found`);
      return [id, variable] as const;
    }),
  );
  return new Map(entries);
};

export const variableFor = (table: VariableTable, id: string): Variable => {
  const variable = table.get(id);
  if (variable === undefined) throw new Error(`variable ${id} was not resolved`);
  return variable;
};

export const boundIdsOf = (sources: readonly { boundVariables?: unknown }[]): string[] =>
  sources.flatMap(source =>
    typeof source.boundVariables === 'object' && source.boundVariables !== null
      ? Object.values(source.boundVariables).filter((id): id is string => typeof id === 'string')
      : [],
  );
