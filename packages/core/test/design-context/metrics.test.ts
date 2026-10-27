import { describe, expect, it } from 'vitest';

import { computeMetrics, dedupeStyles } from '../../src/index.js';
import { textNode } from './fixtures.js';

describe('computeMetrics', () => {
  it('reports node/style/token counts and a dedup size win', () => {
    const inline = ['m1', 'm2', 'm3'].map(id => textNode(id, 'Noto Sans JP', 'Regular', 16));
    const { nodes, globalVars } = dedupeStyles(inline);
    const result = {
      nodes,
      globalVars,
      variables: { 'VariableID:1': { name: 'Primary/500', type: 'COLOR' } },
      styles: {},
    };
    const m = computeMetrics(inline, result);

    expect(m.nodeCount).toBe(3);
    expect(m.maxDepth).toBe(1);
    expect(m.styleCount).toBe(1);
    expect(m.tokenCount).toBe(1);
    expect(m.dedupedSizeKb).toBeLessThan(m.inlineSizeKb);
  });
});
