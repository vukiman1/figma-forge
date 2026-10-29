import { describe, expect, it, vi } from 'vitest';

import { createCreateVectorHandler } from '../../../src/features/vector/create-vector.handler.js';
import { ctxWith, fakeVector } from './vector-fake.js';

describe('create_vector', () => {
  const setup = () => {
    const log: string[] = [];
    const vector = fakeVector(log);
    const page = { appendChild: vi.fn<(n: unknown) => void>(() => log.push('append')) };
    const ctx = ctxWith({}, { createVector: () => vector, currentPage: page });
    return { log, vector, ctx };
  };

  it('places the drawing’s origin first, then draws any SVG syntax in Figma’s dialect', async () => {
    const t = setup();
    await createCreateVectorHandler(t.ctx)({
      x: 40,
      y: 8,
      vectorPaths: [{ windingRule: 'NONE', data: 'M2 2h20a2 2 0 0 1 2 2' }],
    });
    expect(t.log).toEqual([
      'x=40',
      expect.stringMatching(/^paths=M 2 2 L 22 2 C 23\.104569 2 24 2\.895431 24 4$/),
      'append',
    ]);
  });

  it('names a path Figma could not read, and leaves nothing behind', async () => {
    const t = setup();
    await expect(
      createCreateVectorHandler(t.ctx)({ vectorPaths: [{ windingRule: 'NONE', data: 'M 0 0 X' }] }),
    ).rejects.toThrow(/vectorPaths\[0\]\.data is not valid SVG path data: expected a number/);
    expect(t.log).toEqual([]);
  });

  it('removes a vector Figma refused to draw', async () => {
    const t = setup();
    t.vector.setVectorNetworkAsync = vi.fn<() => Promise<void>>(async () => {
      throw new Error('in setVectorNetworkAsync: bad network');
    });
    await expect(
      createCreateVectorHandler(t.ctx)({
        vectorNetwork: { vertices: [{ x: 0, y: 0 }], segments: [] },
      }),
    ).rejects.toThrow('bad network');
    expect(t.vector.remove).toHaveBeenCalled();
  });

  it.each([
    [{}, 'give exactly one of vectorPaths or vectorNetwork'],
    [
      {
        vectorPaths: [{ windingRule: 'NONE', data: 'M 0 0' }],
        vectorNetwork: { vertices: [{ x: 0, y: 0 }], segments: [] },
      },
      'exactly one',
    ],
    [
      { vectorNetwork: { vertices: [{ x: 0, y: 0 }], segments: [{ start: 0, end: 1 }] } },
      'vectorNetwork.segments.0.end: must name one of the 1 vertices (0–0)',
    ],
    [
      {
        vectorNetwork: {
          vertices: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
          segments: [{ start: 0, end: 1 }],
          regions: [{ windingRule: 'NONZERO', loops: [[0, 1]] }],
        },
      },
      'vectorNetwork.regions.0.loops: must list segment indices (0–0)',
    ],
  ])('refuses %j before creating anything', async (params, message) => {
    const t = setup();
    await expect(createCreateVectorHandler(t.ctx)(params)).rejects.toThrow(message);
    expect(t.log).toEqual([]);
  });
});
