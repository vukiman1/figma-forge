export const requireVariable = async (
  figmaCtx: typeof figma,
  tool: string,
  variableId: string,
): Promise<Variable> => {
  const variable = await figmaCtx.variables.getVariableByIdAsync(variableId);
  if (variable === null) throw new Error(`${tool}: variable ${variableId} not found`);
  return variable;
};

export const findVariable = async (
  figmaCtx: typeof figma,
  tool: string,
  variableId: string | null,
): Promise<Variable | null> =>
  variableId === null ? null : requireVariable(figmaCtx, tool, variableId);

export const requireCollection = async (
  figmaCtx: typeof figma,
  tool: string,
  collectionId: string,
): Promise<VariableCollection> => {
  const collection = await figmaCtx.variables.getVariableCollectionByIdAsync(collectionId);
  if (collection === null) {
    throw new Error(
      `${tool}: collection ${collectionId} not found — get_variable_defs lists the collections`,
    );
  }
  return collection;
};
