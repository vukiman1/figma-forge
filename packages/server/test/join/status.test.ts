import { describe, expect, it } from 'vitest';

import { CANDIDATE_FLOOR, statusFor } from '../../src/join/status.js';

describe('statusFor', () => {
  it('grades against the absolute mark at the default bar', () => {
    expect(statusFor(1, 0.7)).toBe('high');
    expect(statusFor(0.9, 0.7)).toBe('high');
    expect(statusFor(0.8, 0.7)).toBe('medium');
    expect(statusFor(0.6, 0.7)).toBe('low');
    expect(statusFor(0.4, 0.7)).toBe('unmapped');
  });

  it('lets a raised bar demote a match the absolute mark would call high', () => {
    expect(statusFor(0.889, 0.7)).toBe('high');
    expect(statusFor(0.889, 0.9)).toBe('low');
    expect(statusFor(0.95, 0.9)).toBe('high');
    expect(statusFor(1, 1)).toBe('high');
  });

  it('is monotonic: raising the bar never promotes a mapping', () => {
    const rank = { unmapped: 0, low: 1, medium: 2, high: 3, 'framework-builtin': 0 } as const;
    for (let c = 0; c <= 1.0001; c += 0.05) {
      let previous = 4;
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const current = rank[statusFor(c, t)];
        expect(current).toBeLessThanOrEqual(previous);
        previous = current;
      }
    }
  });

  it('does not let a lowered bar drag candidates below the reporting floor', () => {
    expect(statusFor(CANDIDATE_FLOOR - 0.01, 0)).toBe('unmapped');
    expect(statusFor(CANDIDATE_FLOOR, 0)).toBe('medium');
  });
});
