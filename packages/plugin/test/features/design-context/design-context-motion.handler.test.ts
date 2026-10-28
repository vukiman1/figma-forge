import type { GetDesignContextResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createGetDesignContextHandler } from '../../../src/features/design-context/get-design-context.handler.js';
import { fakeFigma, node } from './design-context-fake.js';

describe('get_design_context — Motion (beta) summary', () => {
  const animated = (over: Record<string, unknown> = {}): SceneNode =>
    node({
      id: 'anim',
      name: 'Card',
      animationStyles: [{ id: 'as1', name: 'Slide In' }],
      animations: { TRANSLATION_X: {}, OPACITY: {} },
      timelines: [{ id: 't1', duration: 1.2 }],
      ...over,
    });

  it('attaches a compact motion summary at full detail for an animated node', async () => {
    const handler = createGetDesignContextHandler(fakeFigma({ selection: [animated()] }));
    const r = (await handler({ detail: 'full' })) as GetDesignContextResult;
    expect(r.nodes[0]?.motion).toEqual({
      animationStyles: ['Slide In'],
      animatedProperties: ['TRANSLATION_X', 'OPACITY'],
      timelineDuration: 1.2,
    });
  });

  it('omits motion at compact detail — the hot path stays untouched', async () => {
    const handler = createGetDesignContextHandler(fakeFigma({ selection: [animated()] }));
    const r = (await handler({ detail: 'compact' })) as GetDesignContextResult;
    expect(r.nodes[0]?.motion).toBeUndefined();
  });

  it('omits motion for a node that carries no animation', async () => {
    const still = animated({ animationStyles: [], animations: {}, timelines: [] });
    const handler = createGetDesignContextHandler(fakeFigma({ selection: [still] }));
    const r = (await handler({ detail: 'full' })) as GetDesignContextResult;
    expect(r.nodes[0]?.motion).toBeUndefined();
  });

  it('omits motion for a node lacking the Motion mixin entirely', async () => {
    const plain = node({ id: 'p', name: 'Plain' });
    const handler = createGetDesignContextHandler(fakeFigma({ selection: [plain] }));
    const r = (await handler({ detail: 'full' })) as GetDesignContextResult;
    expect(r.nodes[0]?.motion).toBeUndefined();
  });
});
