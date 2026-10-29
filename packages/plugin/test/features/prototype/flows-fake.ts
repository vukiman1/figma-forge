export interface FakeNode {
  id: string;
  type: string;
  name: string;
  visible: boolean;
  parent: FakeNode | null;
  [key: string]: unknown;
}

export interface FakeFlow {
  nodeId: string;
  name: string;
}

interface FlowsPage extends FakeNode {
  autoFlow(nodeId: string): void;
  flowStartingPoints: FakeFlow[];
  stored: FakeFlow[];
  writes: number;
}

const FLOW_TYPES = new Set(['FRAME', 'COMPONENT', 'INSTANCE']);

const pageOf = (node: FakeNode): FakeNode | null => {
  let at: FakeNode | null = node;
  while (at !== null && at.type !== 'PAGE') at = at.parent;
  return at;
};

export const makeFlowsFigma = () => {
  const nodes = new Map<string, FakeNode>();
  const pages: FakeNode[] = [];
  const add = (init: {
    id: string;
    type: string;
    parent: FakeNode | null;
    name?: string;
    visible?: boolean;
    fills?: unknown[];
  }): FakeNode => {
    const full: FakeNode = { ...init, name: init.name ?? init.id, visible: init.visible ?? true };
    full.reactions = [];
    full.setReactionsAsync = async (reactions: unknown[]) => {
      full.reactions = reactions;
      const page = pageOf(full) as FlowsPage | null;
      if (reactions.length === 0 || page === null || page.flowStartingPoints.length > 0) return;
      let top: FakeNode = full;
      while (top.parent !== null && top.parent.type !== 'PAGE' && top.parent.type !== 'SECTION') {
        top = top.parent;
      }
      page.autoFlow(top.id);
    };
    nodes.set(full.id, full);
    return full;
  };

  const makePage = (id: string, name: string): FlowsPage => {
    let stored: FakeFlow[] = [];
    const page = add({ id, type: 'PAGE', name, parent: null }) as FlowsPage;
    pages.push(page);
    const qualifies = (nodeId: string): boolean => {
      const node = nodes.get(nodeId);
      return (
        node !== undefined &&
        pageOf(node) === page &&
        (node.parent === page || node.parent?.type === 'SECTION') &&
        FLOW_TYPES.has(node.type) &&
        node.visible
      );
    };
    Object.defineProperty(page, 'stored', { get: () => stored });
    page.autoFlow = (nodeId: string) => {
      stored = [...stored, { nodeId, name: 'Flow 1' }];
    };
    page.writes = 0;
    Object.defineProperty(page, 'flowStartingPoints', {
      configurable: true,
      get: () =>
        stored.filter(f => qualifies(f.nodeId)).map(f => ({ nodeId: f.nodeId, name: f.name })),
      set: (next: FakeFlow[]) => {
        const ids = next.map(f => f.nodeId);
        if (new Set(ids).size !== ids.length) {
          throw new Error('in set_flowStartingPoints: Found duplicate input nodeIds');
        }
        for (const f of next) {
          if (f.name.length === 0) {
            throw new Error(
              'in set_flowStartingPoints: Can only set flow starting point with non-empty name',
            );
          }
          const node = nodes.get(f.nodeId);
          if (node === undefined) {
            throw new Error(
              'in set_flowStartingPoints: Can only set flow starting point with valid nodeId',
            );
          }
          if (pageOf(node) !== page && node.type !== 'PAGE') {
            throw new Error(
              'in set_flowStartingPoints: Can only set flow starting point on associated page',
            );
          }
          const topLevel = node.parent === page || node.parent?.type === 'SECTION';
          if (!topLevel || !FLOW_TYPES.has(node.type)) {
            throw new Error(
              'in set_flowStartingPoints: Can only set flow starting point that is a top level ' +
                'frame and a valid prototype source (no groups nor immutable or invisible frames)',
            );
          }
        }
        const named = new Set(ids);
        const outOfSight = stored.filter(f => !named.has(f.nodeId) && !qualifies(f.nodeId));
        stored = [...next.map(f => ({ nodeId: f.nodeId, name: f.name })), ...outOfSight];
        page.writes += 1;
      },
    });
    return page;
  };

  const figmaCtx = {
    root: { children: pages },
    getNodeByIdAsync: async (id: string) => nodes.get(id) ?? null,
  } as unknown as typeof figma;

  return { figmaCtx, nodes, add, makePage };
};
