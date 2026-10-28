import type { GetVectorResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createGetVectorHandler } from '../../../src/features/vector/get-vector.handler.js';
import { ctxWith } from './vector-fake.js';

describe('get_vector', () => {
  it('reads paths and the network, Figma’s no-op defaults left out', async () => {
    const node = {
      id: '1:1',
      type: 'VECTOR',
      width: 80,
      height: 60,
      handleMirroring: 'NONE',
      vectorPaths: [{ windingRule: 'NONE', data: 'M 0 15 L 80 15', extra: 1 }],
      vectorNetwork: {
        vertices: [
          { x: 0, y: 15, strokeCap: 'ROUND', strokeJoin: 'MITER', cornerRadius: 0 },
          { x: 80.000001, y: 15, strokeCap: 'NONE', cornerRadius: 12, handleMirroring: 'NONE' },
        ],
        segments: [
          { start: 0, end: 1, tangentStart: { x: 20, y: -20 }, tangentEnd: { x: 0, y: 0 } },
        ],
        regions: [],
      },
    };
    const result = (await createGetVectorHandler(ctxWith({ '1:1': node }))({
      nodeId: '1:1',
    })) as GetVectorResult;
    expect(result).toEqual({
      nodeId: '1:1',
      type: 'VECTOR',
      width: 80,
      height: 60,
      vectorPaths: [{ windingRule: 'NONE', data: 'M 0 15 L 80 15' }],
      vectorNetwork: {
        vertices: [
          { x: 0, y: 15, strokeCap: 'ROUND' },
          { x: 80, y: 15, cornerRadius: 12 },
        ],
        segments: [{ start: 0, end: 1, tangentStart: { x: 20, y: -20 } }],
      },
      handleMirroring: 'NONE',
    });
  });

  it('reports mixed handle mirroring by name, not as Figma’s symbol', async () => {
    const node = {
      id: '1:1',
      type: 'TEXT_PATH',
      width: 1,
      height: 1,
      handleMirroring: Symbol('mixed'),
      vectorPaths: [],
      vectorNetwork: { vertices: [], segments: [] },
    };
    const result = (await createGetVectorHandler(ctxWith({ '1:1': node }))({
      nodeId: '1:1',
    })) as GetVectorResult;
    expect(result.handleMirroring).toBe('mixed');
  });

  it('points a shape at flatten_nodes', async () => {
    await expect(
      createGetVectorHandler(ctxWith({ r: { id: 'r', type: 'RECTANGLE' } }))({ nodeId: 'r' }),
    ).rejects.toThrow('is a RECTANGLE — only a VECTOR or text on a path has a path to read');
  });
});
