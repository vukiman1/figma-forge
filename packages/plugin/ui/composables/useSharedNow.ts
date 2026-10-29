import { createSharedComposable, useIntervalFn, useNow } from '@vueuse/core';

const CLOCK_TICK_MS = 1000;

export const useSharedNow = createSharedComposable(() =>
  useNow({ scheduler: cb => useIntervalFn(cb, CLOCK_TICK_MS) }),
);
