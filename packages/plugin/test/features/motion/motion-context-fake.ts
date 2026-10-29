import type { GetMotionContextResult } from '@figma-forge/core';

import { createGetMotionContextHandler } from '../../../src/features/motion/get-motion-context.handler.js';
export interface FakeNode {
  id: string;
  name: string;
  type: string;
  parent: FakeNode | null;
  children?: FakeNode[];
  applyAnimationStyle?: () => void;
  animationStyles?: unknown[];
  animations?: Record<string, unknown>;
  manualKeyframeTracks?: Record<string, unknown>;
  timelines?: unknown[];
}

export const binding = (times: number[]) => ({
  baseValue: { type: 'FLOAT', value: 0 },
  timelineDuration: 4,
  tracks: [
    {
      id: 'track',
      keyframeOperation: 'SET',
      keyframes: times.map((t, i) => ({
        id: `k${i}`,
        timelinePosition: t,
        value: { type: 'FLOAT', value: i },
        easing: { type: 'LINEAR' },
      })),
    },
  ],
});

export const node = (
  id: string,
  opts: {
    type?: string;
    children?: FakeNode[];
    animations?: Record<string, unknown>;
    animationStyles?: unknown[];
    timelines?: unknown[];
  } = {},
): FakeNode => {
  const n: FakeNode = {
    id,
    name: `name-${id}`,
    type: opts.type ?? (opts.children === undefined ? 'RECTANGLE' : 'FRAME'),
    parent: null,
    applyAnimationStyle: () => {},
    animationStyles: opts.animationStyles ?? [],
    animations: opts.animations ?? {},
    manualKeyframeTracks: {},
    timelines: opts.timelines ?? [{ id: 'T:1', duration: 4 }],
  };
  if (opts.children !== undefined) {
    n.children = opts.children;
    for (const c of opts.children) c.parent = n;
  }
  return n;
};

export const animated = (id: string, times = [1, 1.25, 2]): FakeNode =>
  node(id, { animations: { OPACITY: binding(times) } });

export const fakeFigma = (nodes: FakeNode[]): typeof figma => {
  const byId = new Map<string, FakeNode>();
  const index = (n: FakeNode): void => {
    byId.set(n.id, n);
    for (const c of n.children ?? []) index(c);
  };
  for (const n of nodes) index(n);
  return {
    editorType: 'figma',
    getNodeByIdAsync: async (id: string) => byId.get(id) ?? null,
  } as unknown as typeof figma;
};

export const run = async (roots: FakeNode[], nodeId: string): Promise<GetMotionContextResult> =>
  (await createGetMotionContextHandler(fakeFigma(roots))({ nodeId })) as GetMotionContextResult;

export const range = (n: number): number[] => [...Array(n).keys()];

export const ids = (r: GetMotionContextResult): string[] => r.nodes.map(n => n.nodeId);

export const drain = async (
  roots: FakeNode[],
  nodeId: string,
): Promise<GetMotionContextResult[]> => {
  const results: GetMotionContextResult[] = [];
  const queue = [nodeId];
  while (queue.length > 0) {
    const r = await run(roots, queue.shift() as string);
    results.push(r);
    queue.push(...(r.coverage.pendingNodeIds ?? []));
  }
  return results;
};
