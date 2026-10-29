import { describe, expect, it, vi } from 'vitest';

import { createOutlineStrokeHandler } from '../../../src/features/vector/outline-stroke.handler.js';
import { at, ctxWith } from './vector-fake.js';

describe('outline_stroke', () => {
  const stroked = (strokes: unknown[], strokeWeight: number) => {
    const outlineStroke = vi.fn<() => unknown>(() => null);
    const node = { id: 'S', type: 'TEXT_PATH', strokes, strokeWeight, outlineStroke };
    return { node, outlineStroke, ctx: ctxWith({ S: node }) };
  };

  it.each([
    ['no stroke', [], 1],
    ['only hidden strokes', [{ type: 'SOLID', visible: false }], 1],
    ['a zero weight', [{ type: 'SOLID' }], 0],
  ])('refuses %s without asking Figma, which throws on text on a path', async (_l, strokes, w) => {
    const t = stroked(strokes, w);
    await expect(createOutlineStrokeHandler(t.ctx)({ nodeId: 'S' })).rejects.toThrow(
      'has no stroke to outline — give it one with set_strokes',
    );
    expect(t.outlineStroke).not.toHaveBeenCalled();
  });

  it('refuses when Figma finds nothing to outline', async () => {
    const t = stroked([{ type: 'SOLID' }], 2);
    await expect(createOutlineStrokeHandler(t.ctx)({ nodeId: 'S' })).rejects.toThrow(
      'has no stroke to outline',
    );
    expect(t.outlineStroke).toHaveBeenCalled();
  });

  it('removes the outline when it cannot be placed', async () => {
    const remove = vi.fn<() => void>();
    const outline = {
      id: 'O',
      remove,
      get relativeTransform(): never {
        throw new Error('boom');
      },
    };
    const node = {
      id: 'S',
      strokes: [{ type: 'SOLID' }],
      strokeWeight: 1,
      parent: { type: 'FRAME', absoluteTransform: at(0, 0) },
      outlineStroke: () => outline,
    };
    await expect(createOutlineStrokeHandler(ctxWith({ S: node }))({ nodeId: 'S' })).rejects.toThrow(
      'boom',
    );
    expect(remove).toHaveBeenCalled();
  });
});
