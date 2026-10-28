import { describe, expect, it } from 'vitest';

import { resultCharBudget } from '../../src/serialize/result-budget.js';
import { serializeFlatNodes, serializeTrees } from '../../src/serialize/serialize-runs.js';
import { serializeTree, fake } from './serialize-fake.js';

describe('serializeFlatNodes — result budget', () => {
  const nodes = Array.from({ length: 30 }, (_, i) => fake({ id: `2:${i}`, name: `Node ${i}` }));
  const exactChars = async (): Promise<number> => {
    const all = await serializeFlatNodes(nodes);
    return all.nodes.reduce((sum, n) => sum + JSON.stringify(n).length + 1, 0);
  };

  it('never stops a run that fits, even exactly', async () => {
    const run = await serializeFlatNodes(nodes, { limit: await exactChars(), used: 0 });
    expect(run.complete).toBe(true);
    expect(run.nodes.map(n => n.id)).toEqual(nodes.map(n => n.id));
  });

  it('stops a run that cannot fit, keeping an in-order prefix past the budget', async () => {
    const budget = Math.floor((await exactChars()) / 2);
    const run = await serializeFlatNodes(nodes, { limit: budget, used: 0 });
    expect(run.complete).toBe(false);
    expect(run.nodes.map(n => n.id)).toEqual(nodes.slice(0, run.nodes.length).map(n => n.id));
    expect(run.nodes.reduce((sum, n) => sum + JSON.stringify(n).length + 1, 0)).toBeGreaterThan(
      budget,
    );
  });

  it('draws several runs from one shared allowance', async () => {
    const half = Math.floor((await exactChars()) / 2);
    const shared = { limit: half + 10, used: 0 };
    const [a, b] = await Promise.all([
      serializeFlatNodes(nodes.slice(0, 15), shared),
      serializeFlatNodes(nodes.slice(15), shared),
    ]);
    expect(a.complete && b.complete).toBe(false);
    expect(shared.used).toBeGreaterThan(shared.limit);
    const alone = await serializeFlatNodes(nodes.slice(0, 15), { limit: half + 10, used: 0 });
    expect(alone.complete).toBe(true);
  });

  it('caps a single tool result at the client message limit, less only the envelope', () => {
    const budget = resultCharBudget();
    expect(budget.used).toBe(0);
    expect(budget.limit).toBeGreaterThan(10 * 1024 * 1024 - 64 * 1024);
    expect(budget.limit).toBeLessThan(10 * 1024 * 1024);
  });
});

describe('serializeTrees', () => {
  it('rebuilds the tree in order, children last and after mainComponent, empty arrays kept', async () => {
    const leaf = fake({ id: '1:3', type: 'TEXT' });
    const empty = fake({ id: '1:4', type: 'FRAME', children: [] });
    const instance = fake({
      id: '1:2',
      type: 'INSTANCE',
      children: [leaf, empty],
      getMainComponentAsync: async () => ({ id: '9:1', name: 'Card', key: 'card', parent: null }),
    });
    const run = await serializeTrees([instance, fake({ id: '1:5' })]);
    expect(run.complete).toBe(true);
    expect(run.total).toBe(4);
    expect(run.nodes.map(n => n.id)).toEqual(['1:2', '1:5']);
    const [root] = run.nodes;
    expect(Object.keys(root!).slice(-2)).toEqual(['mainComponent', 'children']);
    expect(root!.children!.map(n => n.id)).toEqual(['1:3', '1:4']);
    expect(root!.children![0]!.children).toBeUndefined();
    expect(root!.children![1]!.children).toEqual([]);
  });

  it('returns no partial tree when the budget stops it', async () => {
    const root = fake({
      id: '1:2',
      type: 'FRAME',
      children: Array.from({ length: 10 }, (_, i) => fake({ id: `2:${i}` })),
    });
    const run = await serializeTrees([root], { limit: 100, used: 0 });
    expect(run).toEqual({ nodes: [], complete: false, total: 11 });
  });
});

describe('serializeTree', () => {
  it('materializes a wide native children array once, preserving all siblings and order', async () => {
    const children = Array.from({ length: 1025 }, (_, index) => fake({ id: `2:${index}` }));
    let reads = 0;
    const root = fake({ type: 'FRAME' });
    Object.defineProperty(root, 'children', {
      get: () => {
        reads += 1;
        return children.slice();
      },
    });
    const out = await serializeTree(root);
    expect(out.children?.map(child => child.id)).toEqual(children.map(child => child.id));
    expect(reads).toBe(1);
  });

  it('recurses into children', async () => {
    const leaf = fake({ id: '1:3', parent: { id: '1:2' } });
    const branch = fake({ id: '1:2', type: 'FRAME', children: [leaf] });
    const root = fake({ id: '1:1', type: 'FRAME', parent: null, children: [branch] });
    const out = await serializeTree(root);
    expect(out.children).toBeDefined();
    expect(out.children?.[0]?.id).toBe('1:2');
    expect(out.children?.[0]?.children?.[0]?.id).toBe('1:3');
  });

  it('omits children when node has no children mixin', async () => {
    const out = await serializeTree(fake({ type: 'RECTANGLE' }));
    expect(out.children).toBeUndefined();
  });

  it('handles empty children array', async () => {
    const out = await serializeTree(fake({ type: 'FRAME', children: [] }));
    expect(out.children).toEqual([]);
  });
});
