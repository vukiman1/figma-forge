import { describe, expect, it } from 'vitest';

import { createSetVectorHandler } from '../../../src/features/vector/set-vector.handler.js';
import { ctxWith, fakeVector } from './vector-fake.js';

describe('set_vector', () => {
  it('redraws a VECTOR, normalising its path', async () => {
    const log: string[] = [];
    const vector = fakeVector(log);
    await createSetVectorHandler(ctxWith({ '9:9': vector }))({
      nodeId: '9:9',
      vectorPaths: [{ windingRule: 'NONE', data: 'm0 0 10 0v5' }],
    });
    expect(log).toEqual(['paths=M 0 0 L 10 0 L 10 5']);
  });

  it('keeps the round ends and joins a line had when its paths are redrawn, not a network', async () => {
    const make = () => {
      const node: Record<string, unknown> = {
        id: 'v',
        type: 'VECTOR',
        strokeCap: 'ROUND',
        strokeJoin: 'ROUND',
        setVectorNetworkAsync: async () => {
          node.strokeCap = 'NONE';
          node.strokeJoin = 'MITER';
        },
      };
      Object.defineProperty(node, 'vectorPaths', {
        set: () => {
          node.strokeCap = 'NONE';
          node.strokeJoin = 'MITER';
        },
      });
      return node;
    };
    const paths = make();
    await createSetVectorHandler(ctxWith({ v: paths }))({
      nodeId: 'v',
      vectorPaths: [{ windingRule: 'NONE', data: 'M 0 0 L 9 9' }],
    });
    expect(paths).toMatchObject({ strokeCap: 'ROUND', strokeJoin: 'ROUND' });
    const network = make();
    await createSetVectorHandler(ctxWith({ v: network }))({
      nodeId: 'v',
      vectorNetwork: { vertices: [{ x: 0, y: 0 }], segments: [] },
    });
    expect(network).toMatchObject({ strokeCap: 'NONE', strokeJoin: 'MITER' });
  });

  it('refuses what has no path of its own to redraw', async () => {
    const ctx = ctxWith({ t: { id: 't', type: 'TEXT_PATH' }, e: { id: 'e', type: 'ELLIPSE' } });
    const paths = [{ windingRule: 'NONE', data: 'M 0 0 L 1 1' }];
    await expect(createSetVectorHandler(ctx)({ nodeId: 't', vectorPaths: paths })).rejects.toThrow(
      'a text path keeps its path',
    );
    await expect(createSetVectorHandler(ctx)({ nodeId: 'e', vectorPaths: paths })).rejects.toThrow(
      'flatten_nodes turns a shape into one',
    );
  });
});
