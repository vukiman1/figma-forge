import { type ActivityParams, ErrorCode, type HelloResult, newId } from '@figma-forge/core';

import {
  type RelayClientOptions,
  type ResolvedRelayOptions,
  resolveRelayOptions,
} from './client-options.js';
import { encodeActivity } from './envelopes.js';
import { errorMessage } from './error-message.js';
import { type HelloRejection, performHandshake } from './hello-handshake.js';
import { LiveLink } from './live-link.js';
import { ReconnectLoop } from './reconnect-loop.js';
import { type RelayListener, RelayStore } from './relay-store.js';
import type { RelayClientState, RelayStatus, ToolHandler } from './state.js';

const BUSY_STATUSES: ReadonlySet<RelayStatus> = new Set([
  'connecting',
  'connected',
  'reconnecting',
]);

const noServerMessage = (ports: readonly number[]): string =>
  `no Figma Forge server on :${ports.join(', ')} yet — it connects automatically once ` +
  `the MCP server starts; if it never does, another process may be holding that port`;

export class RelayClient {
  readonly sessionId: string;
  private readonly options: ResolvedRelayOptions;
  private readonly store = new RelayStore();
  private readonly reconnect: ReconnectLoop;
  private readonly live: LiveLink;
  private isStopped = false;
  private hasConnected = false;
  private isRefused = false;
  private toolHandler: ToolHandler | null = null;

  constructor(opts: RelayClientOptions) {
    this.sessionId = opts.sessionId ?? newId();
    this.options = resolveRelayOptions(opts);
    this.reconnect = new ReconnectLoop(
      {
        store: this.store,
        isStopped: () => this.isStopped,
        isRefused: () => this.isRefused,
        hasConnected: () => this.hasConnected,
        probe: () => this.probeAllPorts(),
      },
      {
        initialDelayMs: this.options.reconnectInitialDelayMs,
        maxDelayMs: this.options.reconnectMaxDelayMs,
      },
    );
    this.live = new LiveLink({
      options: this.options,
      sessionId: this.sessionId,
      store: this.store,
      getHandler: () => this.toolHandler,
      onDropped: () => this.handleDrop(),
    });
  }

  getState(): RelayClientState {
    return this.store.state;
  }

  setToolHandler(handler: ToolHandler | null): void {
    this.toolHandler = handler;
  }

  notifyActivity(params: ActivityParams): void {
    if (!this.live.isOpen || this.store.state.status !== 'connected') return;
    this.live.send(encodeActivity(this.sessionId, params));
  }

  subscribe(fn: RelayListener): () => void {
    return this.store.subscribe(fn);
  }

  async connect(): Promise<void> {
    if (BUSY_STATUSES.has(this.store.state.status)) return;
    this.isStopped = false;
    this.store.update({ status: 'connecting', lastError: null });
    if (await this.probeAllPorts()) return;
    this.store.update({
      status: 'disconnected',
      port: null,
      lastError: this.store.state.lastError ?? noServerMessage(this.options.ports),
    });
    if (!this.isStopped && !this.isRefused) void this.reconnect.run();
  }

  async disconnect(): Promise<void> {
    this.isStopped = true;
    this.reconnect.wake();
    this.live.close();
    this.store.update({ status: 'disconnected', sessionResumed: false, connectedAt: null });
  }

  wake(): void {
    if (this.isStopped) return;
    const { status } = this.store.state;
    if (status === 'connected' || status === 'connecting') return;
    this.reconnect.wake();
  }

  private async probeAllPorts(): Promise<boolean> {
    for (const port of this.options.ports) {
      if (this.isStopped) return false;
      try {
        // oxlint-disable-next-line no-await-in-loop -- probe candidate ports in order
        await this.attemptPort(port);
        return true;
      } catch (error) {
        this.options.log(`[relay-client] port ${port} failed: ${errorMessage(error)}`);
      }
    }
    return false;
  }

  private attemptPort(port: number): Promise<void> {
    return performHandshake({
      options: this.options,
      port,
      sessionId: this.sessionId,
      onRejected: rejection => this.handleRejection(rejection),
      onAccepted: (ws, result) => this.handleAcceptance(ws, port, result),
    });
  }

  private handleRejection(rejection: HelloRejection): void {
    if (rejection.code === ErrorCode.ProtocolMismatch) this.isRefused = true;
    this.store.update({
      lastError: rejection.message,
      versionNotice: this.isRefused ? rejection.message : null,
    });
  }

  private handleAcceptance(ws: WebSocket, port: number, result: HelloResult): void {
    this.hasConnected = true;
    this.isRefused = false;
    this.live.attach(ws);
    this.store.update({
      status: 'connected',
      port,
      sessionResumed: result.sessionResumed,
      serverVersion: result.serverVersion,
      lastError: null,
      versionNotice: result.skewNotice ?? null,
      foregroundFlag: result.foregroundFlag === true,
      connectedAt: Date.now(),
    });
    this.options.log(`[relay-client] connected to :${port} (resumed=${result.sessionResumed})`);
  }

  private handleDrop(): void {
    this.store.update({ status: 'disconnected', sessionResumed: false, connectedAt: null });
    if (!this.isStopped) void this.reconnect.run();
  }
}
