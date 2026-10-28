import { describe, expect, it } from 'vitest';

import { captureGeometry } from '../../../../src/features/batch/snapshot/geometry.js';
import {
  captureLayoutScope,
  restoreLayoutDrift,
} from '../../../../src/features/batch/snapshot/layout-scope.js';
import { ctxFor, type Node } from './snapshot-fake.js';

describe('layout scope', () => {
  it('records the constrained boxes of the region, not in-flow children or instance sublayers', async () => {
    const t = [
      [1, 0, 0],
      [0, 1, 0],
    ];
    const al: Node = {
      id: 'AL',
      type: 'FRAME',
      layoutMode: 'HORIZONTAL',
      width: 10,
      height: 10,
      relativeTransform: t,
    };
    const inflow: Node = {
      id: 'IN',
      type: 'RECTANGLE',
      parent: al,
      layoutPositioning: 'AUTO',
      width: 1,
      height: 1,
      relativeTransform: t,
    };
    const absolute: Node = {
      id: 'ABS',
      type: 'RECTANGLE',
      parent: al,
      layoutPositioning: 'ABSOLUTE',
      width: 5,
      height: 5,
      relativeTransform: t,
    };
    const sublayer: Node = {
      id: 'I1;2',
      type: 'RECTANGLE',
      parent: al,
      layoutPositioning: 'ABSOLUTE',
      width: 5,
      height: 5,
      relativeTransform: t,
    };
    al.parent = { id: 'PAGE', type: 'PAGE' };
    al.findAll = () => [inflow, absolute, sublayer];
    const store = new Map<string, Node>([al, inflow, absolute, sublayer].map(n => [n.id, n]));

    const scope = await captureLayoutScope(ctxFor(store), ['IN']);

    expect(scope.map(s => s.id)).toEqual(['AL', 'ABS']);
  });

  it('puts a drifted constrained box back and leaves an undrifted one alone', async () => {
    const writes: string[] = [];
    const box = (id: string): Node => ({
      id,
      type: 'RECTANGLE',
      parent: { layoutMode: 'NONE' },
      width: 100,
      height: 20,
      relativeTransform: [
        [1, 0, 50],
        [0, 1, 0],
      ],
      resizeWithoutConstraints(this: Node, w: number, h: number) {
        writes.push(`${id} size`);
        this.width = w;
        this.height = h;
      },
    });
    const drifted = box('D');
    const steady = box('S');
    const store = new Map<string, Node>([drifted, steady].map(n => [n.id, n]));
    const scope = [
      captureGeometry(drifted as unknown as SceneNode),
      captureGeometry(steady as unknown as SceneNode),
    ];
    drifted.width = 0.01;

    await restoreLayoutDrift(ctxFor(store), scope);

    expect(drifted.width).toBe(100);
    expect(writes).toEqual(['D size']);
  });
});
