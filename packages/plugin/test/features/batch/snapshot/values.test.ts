import { describe, expect, it } from 'vitest';

import { same, writeIfDifferent } from '../../../../src/features/batch/snapshot/values.js';

describe('same / writeIfDifferent', () => {
  it('never treats figma.mixed as equal to a value, and never writes it', () => {
    const mixed = Symbol('mixed');
    expect(same(mixed, 1)).toBe(false);
    expect(same({ a: [1] }, { a: [1] })).toBe(true);
    const node = { fills: 'x', opacity: 1 };
    writeIfDifferent(node, 'fills', mixed);
    writeIfDifferent(node, 'missing', 2);
    expect(node).toEqual({ fills: 'x', opacity: 1 });
  });

  it('skips a write whose value is already there', () => {
    const writes: unknown[] = [];
    const node = {
      get opacity() {
        return 0.5;
      },
      set opacity(v: unknown) {
        writes.push(v);
      },
    };
    writeIfDifferent(node, 'opacity', 0.5);
    writeIfDifferent(node, 'opacity', 0.2);
    expect(writes).toEqual([0.2]);
  });
});
