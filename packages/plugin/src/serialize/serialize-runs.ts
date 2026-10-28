import type { SearchNodesResult, SerializedNode } from '@figma-forge/core';

import { TimeSlice } from '../runtime/cooperative.js';
import type { CharBudget } from './result-budget.js';
import { serializeFlat } from './serialize-node.js';
import { type FlatForest, flattenForest } from './traverse.js';

const MAX_IN_FLIGHT = 512;
const SEPARATOR_CHARS = 1;

export interface SerializedRun {
  readonly nodes: SerializedNode[];
  readonly complete: boolean;
}

class OrderedRun {
  readonly done: SerializedNode[] = [];

  private readonly inFlight: Promise<SerializedNode>[] = [];

  constructor(private readonly budget: CharBudget | null) {}

  get pending(): number {
    return this.inFlight.length;
  }

  add(node: SceneNode): void {
    const serialized = serializeFlat(node);
    serialized.catch(() => undefined);
    this.inFlight.push(serialized);
  }

  async settleOldest(): Promise<void> {
    const oldest = this.inFlight.shift();
    if (oldest === undefined) return;
    const serialized = await oldest;
    this.done.push(serialized);
    if (this.budget !== null)
      this.budget.used += JSON.stringify(serialized).length + SEPARATOR_CHARS;
  }

  isSpent(): boolean {
    return this.budget !== null && this.budget.used > this.budget.limit;
  }
}

const serializeInOrder = async (
  nodes: readonly SceneNode[],
  budget: CharBudget | null,
): Promise<SerializedRun> => {
  const run = new OrderedRun(budget);
  const slice = new TimeSlice();
  for (const node of nodes) {
    run.add(node);
    // oxlint-disable-next-line no-await-in-loop -- bound outstanding main-component lookups
    if (run.pending >= MAX_IN_FLIGHT) await run.settleOldest();
    if (run.isSpent()) return { nodes: run.done, complete: false };
    // oxlint-disable-next-line no-await-in-loop -- hand the thread back between slices
    if (slice.due()) await slice.yield();
  }
  while (run.pending > 0) {
    // oxlint-disable-next-line no-await-in-loop -- settle in order so the budget sees a prefix
    await run.settleOldest();
    if (run.isSpent()) return { nodes: run.done, complete: false };
  }
  return { nodes: run.done, complete: true };
};

export const serializeFlatNodes = async (
  nodes: readonly SceneNode[],
  budget: CharBudget | null = null,
): Promise<SerializedRun> => serializeInOrder(nodes, budget);

export const toNodeListResult = (
  matches: readonly SceneNode[],
  run: SerializedRun,
): SearchNodesResult =>
  run.complete ? { nodes: run.nodes } : { matchCount: matches.length, nodes: run.nodes };

const rebuildTrees = (forest: FlatForest, nodes: readonly SerializedNode[]): SerializedNode[] => {
  const roots: SerializedNode[] = [];
  const childLists: (SerializedNode[] | undefined)[] = [];
  nodes.forEach((node, index) => {
    if (forest.hasChildren[index] === true) {
      const list: SerializedNode[] = [];
      node.children = list;
      childLists[index] = list;
    }
    const parent = forest.parents[index] ?? -1;
    (parent < 0 ? roots : childLists[parent])?.push(node);
  });
  return roots;
};

export const serializeTrees = async (
  roots: readonly SceneNode[],
  budget: CharBudget | null = null,
): Promise<SerializedRun & { total: number }> => {
  const forest = await flattenForest(roots);
  const total = forest.nodes.length;
  const run = await serializeInOrder(forest.nodes, budget);
  if (!run.complete) return { nodes: [], complete: false, total };
  return { nodes: rebuildTrees(forest, run.nodes), complete: true, total };
};
