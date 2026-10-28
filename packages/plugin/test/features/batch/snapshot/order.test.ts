import { describe, expect, it } from 'vitest';

import { restoreOrder } from '../../../../src/features/batch/snapshot/order.js';
import { ctxFor, type Node } from './snapshot-fake.js';

describe('restoreOrder', () => {
  const container = (
    ids: string[],
  ): Node & { children: Node[]; insertChild: (index: number, child: Node) => void } => {
    const parent = {
      id: 'P',
      children: [] as Node[],
      insertChild(index: number, child: Node) {
        const at = parent.children.indexOf(child);
        parent.children.splice(index, 0, child);
        if (at !== -1) parent.children.splice(at < index ? at : at + 1, 1);
      },
    };
    parent.children = ids.map(id => ({ id }));
    return parent;
  };

  it('rebuilds a shuffled child order exactly, placing ascending since insertChild counts the index before removing the node', async () => {
    const parent = container(['a', 'b', 'c', 'd']);
    const store = new Map<string, Node>([
      ['P', parent],
      ...parent.children.map(c => [c.id, c] as [string, Node]),
    ]);
    parent.insertChild(3, parent.children[0]!);
    parent.insertChild(0, parent.children[3]!);
    expect(parent.children.map(c => c.id).join('')).not.toBe('abcd');

    await restoreOrder(ctxFor(store), 'P', ['a', 'b', 'c', 'd']);

    expect(parent.children.map(c => c.id).join('')).toBe('abcd');
  });

  it('leaves a child that was not in the snapshot after the ones that were', async () => {
    const parent = container(['x', 'a', 'b']);
    const store = new Map<string, Node>([
      ['P', parent],
      ...parent.children.map(c => [c.id, c] as [string, Node]),
    ]);
    await restoreOrder(ctxFor(store), 'P', ['a', 'b']);
    expect(parent.children.map(c => c.id)).toEqual(['a', 'b', 'x']);
  });
});
