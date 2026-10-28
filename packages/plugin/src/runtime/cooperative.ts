import { createHostYield, parseHostYield } from '../../protocol/host-yield.js';

export const SLICE_MS = 40;

const THROTTLED_YIELD_MS = 250;
const BACKOFF_SLICE_MS = 250;
const THROTTLED_BACKOFF_MS = 30_000;

let throttledUntil = 0;
let wasBackground = false;
let nextYieldId = 0;
const pendingYields = new Map<number, (isBackground: boolean) => void>();

const onResume =
  (resolve: () => void) =>
  (isBackground: boolean): void => {
    if (isBackground) throttledUntil = Date.now() + THROTTLED_BACKOFF_MS;
    else if (wasBackground) throttledUntil = 0;
    wasBackground = isBackground;
    resolve();
  };

const yieldToHost = async (): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    if (typeof figma === 'undefined') {
      setTimeout(resolve, 0);
      return;
    }
    nextYieldId += 1;
    const id = nextYieldId;
    pendingYields.set(id, onResume(resolve));
    try {
      // oxlint-disable-next-line unicorn/require-post-message-target-origin -- figma.ui.postMessage takes no target origin
      figma.ui.postMessage(createHostYield(id, 'yield-request'));
    } catch (error) {
      pendingYields.delete(id);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });

export const resumeHostYield = (raw: unknown): boolean => {
  const message = parseHostYield(raw);
  if (message?.kind !== 'yield-resume') return false;
  const resume = pendingYields.get(message.id);
  pendingYields.delete(message.id);
  resume?.(message.background);
  return true;
};

export class TimeSlice {
  private start = Date.now();

  due(): boolean {
    const now = Date.now();
    const length = now < throttledUntil ? BACKOFF_SLICE_MS : SLICE_MS;
    return now - this.start >= length;
  }

  async yield(): Promise<void> {
    const before = Date.now();
    await yieldToHost();
    const after = Date.now();
    if (after - before >= THROTTLED_YIELD_MS) throttledUntil = after + THROTTLED_BACKOFF_MS;
    this.start = after;
  }
}

export const resetThrottleForTests = (): void => {
  throttledUntil = 0;
  wasBackground = false;
};
