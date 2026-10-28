export const node = (over: Record<string, unknown>): SceneNode =>
  ({
    id: 'x',
    name: 'x',
    type: 'FRAME',
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    parent: { id: 'root' },
    ...over,
  }) as unknown as SceneNode;

export const fakeFigma = (opts: {
  selection?: SceneNode[];
  pageChildren?: SceneNode[];
  lookup?: Record<string, BaseNode | null>;
  variables?: Record<
    string,
    { name: string; resolvedType: string; codeSyntax?: Record<string, string> }
  >;
  styles?: Record<string, { name: string; type: string }>;
  collections?: Record<
    string,
    { id: string; name: string; defaultModeId: string; modes: { modeId: string; name: string }[] }
  >;
}): typeof figma =>
  ({
    currentPage: { selection: opts.selection ?? [], children: opts.pageChildren ?? [] },
    getNodeByIdAsync: async (id: string) => opts.lookup?.[id] ?? null,
    getStyleByIdAsync: async (id: string) => opts.styles?.[id] ?? null,
    variables: {
      getVariableByIdAsync: async (id: string) => opts.variables?.[id] ?? null,
      getVariableCollectionByIdAsync: async (id: string) => opts.collections?.[id] ?? null,
    },
  }) as unknown as typeof figma;
