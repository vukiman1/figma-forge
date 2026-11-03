import {
  DESIGN_CONTEXT_TOKEN_BUDGET,
  estimateResultTokens,
  type DesignContextNode,
  type GetDesignContextResult,
} from '@figma-forge/core';
import { describe, expect, it } from 'vitest';

import {
  handleDesignContext,
  type ToolDispatcher,
} from '../../../src/tools/read/design-context-guard.js';

const leaf = (id: string, extra: Record<string, unknown> = {}): DesignContextNode => ({
  id,
  name: `n-${id}`,
  type: 'RECTANGLE',
  ...extra,
});

const dispatching =
  (payload: GetDesignContextResult): ToolDispatcher =>
  async () =>
    payload;

describe('a splittable over-budget tree becomes a section plan, not a coordinate dump', () => {
  it('prefers the plan over any geometry-only projection', async () => {
    const fat = 'x'.repeat(400);
    const sections = ['a', 'b', 'c'].map((suffix, index) =>
      leaf(`s${index}`, {
        name: `Section ${suffix}`,
        type: 'FRAME',
        children: Array.from({ length: 300 }, (_child, leafIndex) =>
          leaf(`s${index}-l${leafIndex}`, {
            x: 1,
            y: 2,
            width: 3,
            height: 4,
            layout: { mode: 'VERTICAL', itemSpacing: 24 },
            characters: 'y'.repeat(60),
            fills: fat,
          }),
        ),
      }),
    );
    const payload: GetDesignContextResult = {
      nodes: [
        leaf('root', {
          name: 'Page',
          type: 'FRAME',
          layout: { mode: 'VERTICAL', itemSpacing: 40, paddingTop: 64 },
          children: sections,
        }),
      ],
    };
    const result = await handleDesignContext(dispatching(payload), {});

    expect(result.sectionPlan?.reason).toBe('payload-size');
    expect(result.sectionPlan?.sections.map(section => section.nodeId)).toEqual(['s0', 's1', 's2']);
    expect(result.nodes[0]?.layout).toEqual({
      mode: 'VERTICAL',
      itemSpacing: 40,
      paddingTop: 64,
    });
    expect(result.nodes[0]?.children).toBeUndefined();
    expect(Object.keys(result)[0]).toBe('note');
    expect(estimateResultTokens(JSON.stringify(result))).toBeLessThanOrEqual(
      DESIGN_CONTEXT_TOKEN_BUDGET,
    );
  });
});
