import { backoffDelayMs, BackoffSleep } from './backoff-sleep.js';
import type { RelayStore } from './relay-store.js';

const COLD_START_MAX_DELAY_MS = 1_000;

type RetryOutcome = 'finished' | 'woken' | 'slept';

export interface ReconnectHost {
  readonly store: RelayStore;
  readonly isStopped: () => boolean;
  readonly isRefused: () => boolean;
  readonly hasConnected: () => boolean;
  readonly probe: () => Promise<boolean>;
}

export interface ReconnectDelays {
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
}

export class ReconnectLoop {
  private isRunning = false;
  private readonly sleeper = new BackoffSleep();

  constructor(
    private readonly host: ReconnectHost,
    private readonly delays: ReconnectDelays,
  ) {}

  wake(): void {
    this.sleeper.wake();
  }

  async run(): Promise<void> {
    if (this.isRunning || this.host.isStopped() || this.host.isRefused()) return;
    this.isRunning = true;
    try {
      await this.retryUntilFinished();
    } finally {
      this.isRunning = false;
    }
  }

  private async retryUntilFinished(): Promise<void> {
    const isTrueReconnect = this.host.hasConnected();
    const maxDelayMs = isTrueReconnect ? this.delays.maxDelayMs : COLD_START_MAX_DELAY_MS;
    let attempt = 0;
    while (!this.host.isStopped()) {
      const delayMs = backoffDelayMs(attempt, this.delays.initialDelayMs, maxDelayMs);
      // oxlint-disable-next-line no-await-in-loop -- back-off pacing requires sequential awaits
      const outcome = await this.retryOnce(delayMs, isTrueReconnect);
      if (outcome === 'finished') return;
      attempt = outcome === 'woken' ? 0 : attempt + 1;
    }
  }

  private async retryOnce(delayMs: number, isTrueReconnect: boolean): Promise<RetryOutcome> {
    const { store } = this.host;
    store.update({ status: 'reconnecting' });
    const isWoken = await this.sleeper.sleep(delayMs);
    if (this.host.isStopped()) return 'finished';
    if (await this.host.probe()) {
      if (isTrueReconnect) store.update({ reconnectCount: store.state.reconnectCount + 1 });
      return 'finished';
    }
    if (this.host.isRefused()) {
      store.update({ status: 'disconnected' });
      return 'finished';
    }
    return isWoken ? 'woken' : 'slept';
  }
}
