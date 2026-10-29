import type { GetDesignContextResult } from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import { createGetDesignContextHandler } from '../../../src/features/design-context/get-design-context.handler.js';
import { fakeFigma, node } from './design-context-fake.js';

describe('get_design_context node-count bail (budget)', () => {
  const bigTree = (sections = 8, leavesPer = 250): SceneNode => {
    const sectionNodes = Array.from({ length: sections }, (_a, s) =>
      node({
        id: `s${s}`,
        name: `Section ${s}`,
        children: Array.from({ length: leavesPer }, (_b, l) =>
          node({ id: `s${s}-l${l}`, type: 'RECTANGLE' }),
        ),
      }),
    );
    return node({ id: 'root', name: 'Page', children: sectionNodes });
  };

  it('bails to a section plan on full detail when budget is set', async () => {
    const handler = createGetDesignContextHandler(fakeFigma({ selection: [bigTree()] }));
    const r = (await handler({ detail: 'full', budget: true })) as GetDesignContextResult;

    expect(r.sectionPlan?.reason).toBe('node-count');
    expect(Object.keys(r)[0]).toBe('note');
    expect(r.nodes[0]?.id).toBe('root');
    expect(r.nodes[0]?.children).toBeUndefined();
    expect(r.sectionPlan?.totalNodes).toBe(1 + 8 + 8 * 250);
    expect(r.sectionPlan?.sections).toHaveLength(8);
    expect(r.sectionPlan?.sections[0]).toMatchObject({
      nodeId: 's0',
      name: 'Section 0',
      childCount: 250,
      nodes: 251,
    });
    const root = r.nodes[0] as unknown as Record<string, unknown>;
    expect(root).toMatchObject({ id: 'root', name: 'Page', type: 'FRAME' });
    expect(root.children).toBeUndefined();
    for (const styling of [
      'fills',
      'strokes',
      'effects',
      'fill',
      'stroke',
      'effect',
      'textStyle',
    ]) {
      expect(root[styling]).toBeUndefined();
    }
    expect(r.note).toMatch(/section by section/);
    expect(r.globalVars).toBeUndefined();
  });

  it('never bails without the budget flag (internal consumers get the raw tree)', async () => {
    const handler = createGetDesignContextHandler(fakeFigma({ selection: [bigTree(2, 900)] }));
    const r = (await handler({ detail: 'full' })) as GetDesignContextResult;
    expect(r.sectionPlan).toBeUndefined();
    expect(r.nodes[0]?.children).toHaveLength(2);
  });

  it('never bails below full detail (compact stays the cheap structure scan)', async () => {
    const handler = createGetDesignContextHandler(fakeFigma({ selection: [bigTree(2, 900)] }));
    const r = (await handler({ detail: 'compact', budget: true })) as GetDesignContextResult;
    expect(r.sectionPlan).toBeUndefined();
  });

  it('returns the normal result under the threshold even with budget set', async () => {
    const handler = createGetDesignContextHandler(fakeFigma({ selection: [bigTree(3, 10)] }));
    const r = (await handler({ detail: 'full', budget: true })) as GetDesignContextResult;
    expect(r.sectionPlan).toBeUndefined();
    expect(r.nodes[0]?.children).toHaveLength(3);
  });

  it('honors an explicit depth cap when counting (a capped call serializes fine)', async () => {
    const handler = createGetDesignContextHandler(fakeFigma({ selection: [bigTree(2, 900)] }));
    const r = (await handler({ detail: 'full', budget: true, depth: 1 })) as GetDesignContextResult;
    expect(r.sectionPlan).toBeUndefined();
    expect(r.nodes[0]?.children?.[0]?.truncated).toBe(true);
  });

  it('descends through a single-child wrapper and caps very wide plans', async () => {
    const wide = Array.from({ length: 80 }, (_a, i) =>
      node({
        id: `w${i}`,
        children: Array.from({ length: 30 }, (_b, l) => node({ id: `w${i}-l${l}` })),
      }),
    );
    const wrapper = node({ id: 'wrap', name: 'Wrapper', children: wide });
    const root = node({ id: 'root', name: 'Page', children: [wrapper] });
    const handler = createGetDesignContextHandler(fakeFigma({ selection: [root] }));

    const r = (await handler({ detail: 'full', budget: true })) as GetDesignContextResult;
    expect(r.sectionPlan?.sections).toHaveLength(60);
    expect(r.sectionPlan?.sectionsOmitted).toBe(20);
    expect(r.sectionPlan?.sections[0]?.nodeId).toBe('w0');
  });
});
