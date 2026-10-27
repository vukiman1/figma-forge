import { describe, expect, it } from 'vitest';

import { createSetTextPathHandler } from '../../../src/features/text/set-text-path.handler.js';

const segments = (n: number) => ({ segments: Array.from({ length: n }, () => ({})) });

describe('set_text_path handler', () => {
  const textPath = () => {
    const node = {
      id: '2:1',
      type: 'TEXT_PATH',
      vectorNetwork: segments(4),
      textPathStartData: { segment: 1, position: 0.25 },
    };
    const ctx = { getNodeByIdAsync: async () => node } as unknown as typeof figma;
    return { node, ctx };
  };

  it('moves the start, keeping whichever half is not given', async () => {
    const t = textPath();
    await createSetTextPathHandler(t.ctx)({ nodeId: '2:1', startPosition: 0.5 });
    expect(t.node.textPathStartData).toEqual({ segment: 1, position: 0.5 });
    await createSetTextPathHandler(t.ctx)({ nodeId: '2:1', startSegment: 3 });
    expect(t.node.textPathStartData).toEqual({ segment: 3, position: 0.5 });
  });

  it('refuses a segment past the last, which Figma would silently drop', async () => {
    const t = textPath();
    await expect(
      createSetTextPathHandler(t.ctx)({ nodeId: '2:1', startSegment: 4 }),
    ).rejects.toThrow('keep the start where it is');
    expect(t.node.textPathStartData).toEqual({ segment: 1, position: 0.25 });
  });

  it('needs something to move, and a text path to move it on', async () => {
    const t = textPath();
    await expect(createSetTextPathHandler(t.ctx)({ nodeId: '2:1' })).rejects.toThrow(
      'give startSegment, startPosition or both',
    );
    const ctx = {
      getNodeByIdAsync: async () => ({ id: '3:1', type: 'TEXT' }),
    } as unknown as typeof figma;
    await expect(createSetTextPathHandler(ctx)({ nodeId: '3:1', startSegment: 0 })).rejects.toThrow(
      'not text on a path',
    );
  });
});
