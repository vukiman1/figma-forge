export type Node = Record<string, unknown> & { id: string };

export const ctxFor = (store: Map<string, Node>): typeof figma =>
  ({
    getNodeByIdAsync: async (id: string) => store.get(id) ?? null,
    variables: { getVariableByIdAsync: async (id: string) => ({ id }) },
  }) as unknown as typeof figma;
