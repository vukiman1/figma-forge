import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, watch } from 'vue';

import { useSharedNow } from '../../ui/composables/useSharedNow.js';

describe('useSharedNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ticks once a second instead of useNow’s default of once an animation frame', async () => {
    const scope = effectScope();
    let ticks = 0;

    scope.run(() => {
      watch(useSharedNow(), () => (ticks += 1), { flush: 'sync' });
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(ticks).toBe(1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(ticks).toBe(3);

    scope.stop();
  });

  it('hands every consumer the same clock', () => {
    const scope = effectScope();

    const [first, second] = scope.run(() => [useSharedNow(), useSharedNow()]) ?? [];

    expect(first).toBeDefined();
    expect(first).toBe(second);

    scope.stop();
  });
});
