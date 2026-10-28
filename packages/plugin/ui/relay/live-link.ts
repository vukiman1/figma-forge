import type { HeartbeatMonitor } from '@figma-forge/core';

import type { ResolvedRelayOptions } from './client-options.js';
import type { EncodedEnvelope } from './envelopes.js';
import { startLiveHeartbeat } from './live-heartbeat.js';
import { bindLiveSocket } from './live-socket.js';
import type { RelayStore } from './relay-store.js';
import type { ToolHandler } from './state.js';
import { dispatchToolRequest, type ToolDispatchContext } from './tool-dispatch.js';

const NORMAL_CLOSURE_CODE = 1000;

export interface LiveLinkDeps {
  readonly options: Pick<
    ResolvedRelayOptions,
    'heartbeatIntervalMs' | 'heartbeatMaxMisses' | 'log'
  >;
  readonly sessionId: string;
  readonly store: RelayStore;
  readonly getHandler: () => ToolHandler | null;
  readonly onDropped: () => void;
}

export class LiveLink {
  private socket: WebSocket | null = null;
  private heartbeat: HeartbeatMonitor | null = null;

  constructor(private readonly deps: LiveLinkDeps) {}

  get isOpen(): boolean {
    return this.socket !== null;
  }

  send(bytes: EncodedEnvelope): void {
    this.socket?.send(bytes);
  }

  attach(ws: WebSocket): void {
    const { options, sessionId } = this.deps;
    this.socket = ws;
    this.heartbeat?.stop();
    this.heartbeat = startLiveHeartbeat(ws, {
      intervalMs: options.heartbeatIntervalMs,
      maxMisses: options.heartbeatMaxMisses,
      sessionId,
      log: options.log,
    });
    this.bind(ws);
  }

  close(): void {
    this.stopHeartbeat();
    if (this.socket === null) return;
    this.socket.close(NORMAL_CLOSURE_CODE, 'client disconnect');
    this.socket = null;
  }

  private bind(ws: WebSocket): void {
    const { store, getHandler, options } = this.deps;
    const notifyAlive = (): void => this.heartbeat?.notifyReceived();
    const dispatchContext: ToolDispatchContext = {
      store,
      getHandler,
      log: options.log,
      notifyAlive,
    };
    bindLiveSocket(ws, {
      log: options.log,
      onReceived: notifyAlive,
      onToolRequest: request => void dispatchToolRequest(dispatchContext, ws, request),
      onClosed: () => this.drop(),
      onError: () => store.update({ lastError: 'socket error' }),
    });
  }

  private drop(): void {
    this.stopHeartbeat();
    this.socket = null;
    this.deps.onDropped();
  }

  private stopHeartbeat(): void {
    this.heartbeat?.stop();
    this.heartbeat = null;
  }
}
