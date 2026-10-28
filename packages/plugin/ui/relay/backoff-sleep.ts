const BACKOFF_GROWTH_FACTOR = 2;

export const backoffDelayMs = (attempt: number, initialMs: number, maxMs: number): number =>
  Math.min(initialMs * BACKOFF_GROWTH_FACTOR ** attempt, maxMs);

export class BackoffSleep {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private settle: ((isWoken: boolean) => void) | null = null;

  sleep(ms: number): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      this.settle = resolve;
      this.timer = setTimeout(() => this.finish(false), ms);
    });
  }

  wake(): void {
    this.finish(true);
  }

  private finish(isWoken: boolean): void {
    const resolve = this.settle;
    if (resolve === null) return;
    this.settle = null;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    resolve(isWoken);
  }
}
