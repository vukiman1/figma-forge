import { initialRelayState, type RelayClientState } from './state.js';

export type RelayListener = (state: RelayClientState) => void;

export class RelayStore {
  private current: RelayClientState = initialRelayState();
  private readonly listeners = new Set<RelayListener>();

  get state(): RelayClientState {
    return this.current;
  }

  update(partial: Partial<RelayClientState>): void {
    this.current = { ...this.current, ...partial };
    for (const listener of this.listeners) listener(this.current);
  }

  subscribe(listener: RelayListener): () => void {
    this.listeners.add(listener);
    listener(this.current);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
