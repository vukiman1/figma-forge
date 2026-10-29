import type { Server as HttpServer } from 'node:http';

import { HEARTBEAT_INTERVAL_MS, HEARTBEAT_MAX_MISSES } from '@figma-forge/core';

import type { PluginSessionInfo } from '../routing/sessions.js';
import { PendingRequests, type ServedBy } from './pending-requests.js';
import { PluginConnections } from './plugin-connections.js';
import { DEFAULT_DISCONNECT_GRACE_MS, isLive, type Session, SessionManager } from './session.js';
import { skewNoticeFor } from './skew-notice.js';

export interface RelayOptions {
  serverVersion: string;
  server: HttpServer;
  log?: (msg: string) => void;
  heartbeatIntervalMs?: number;
  heartbeatMaxMisses?: number;
  disconnectGraceMs?: number;
}

export const DEFAULT_PLUGIN_REQUEST_TIMEOUT_MS = 30_000;

export class Relay {
  readonly sessions = new SessionManager();
  private readonly pending = new PendingRequests();
  private readonly connections: PluginConnections;
  private readonly serverVersion: string;
  private readonly log: (msg: string) => void;
  private lastRequestAtMs = 0;

  constructor(options: RelayOptions) {
    this.serverVersion = options.serverVersion;
    this.log = options.log ?? (() => {});
    this.connections = new PluginConnections(this.sessions, this.pending, {
      server: options.server,
      serverVersion: options.serverVersion,
      log: this.log,
      heartbeatIntervalMs: options.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS,
      heartbeatMaxMisses: options.heartbeatMaxMisses ?? HEARTBEAT_MAX_MISSES,
      disconnectGraceMs: options.disconnectGraceMs ?? DEFAULT_DISCONNECT_GRACE_MS,
    });
  }

  async stop(): Promise<void> {
    this.pending.rejectAll(method => new Error(`relay stopping (pending ${method})`));
    this.sessions.clear();
    await this.connections.close();
  }

  async sendRequest(
    method: string,
    params?: unknown,
    timeoutMs: number = DEFAULT_PLUGIN_REQUEST_TIMEOUT_MS,
    sessionId?: string,
    onServed?: (servingSessionId: string | undefined) => void,
  ): Promise<unknown> {
    this.lastRequestAtMs = Date.now();
    const served: ServedBy = { sessionId: undefined };
    const request = this.pending.open({
      method,
      params,
      pinnedSessionId: sessionId,
      timeoutMs,
      served,
    });
    this.route(request.id, method, sessionId);
    try {
      return await request.settled;
    } finally {
      onServed?.(served.sessionId);
    }
  }

  skewNotice(sessionId: string | undefined): string | null {
    const session = sessionId === undefined ? undefined : this.sessions.get(sessionId);
    return session === undefined ? null : skewNoticeFor(session, this.serverVersion);
  }

  pendingCount(): number {
    return this.pending.count();
  }

  queuedCount(): number {
    return this.pending.queuedCount();
  }

  heartbeatDeferralCount(): number {
    return this.connections.heartbeatDeferralCount();
  }

  lastRequestAt(): number {
    return this.lastRequestAtMs;
  }

  pickActiveSession(): Session | undefined {
    return this.sessions.mostActive();
  }

  pickActiveSessionId(): string | undefined {
    return this.pickActiveSession()?.id;
  }

  listSessionInfo(): readonly PluginSessionInfo[] {
    return this.sessions.infoByActivity();
  }

  private route(id: string, method: string, pinnedSessionId: string | undefined): void {
    if (pinnedSessionId === undefined) {
      this.routeToActive(id, method);
      return;
    }
    const target = this.sessions.get(pinnedSessionId);
    if (target === undefined) {
      const reason = `pinned session not connected (sessionId=${pinnedSessionId}, method=${method})`;
      this.pending.fail(id, new Error(reason));
      return;
    }
    if (isLive(target)) {
      this.pending.dispatch(id, target);
      return;
    }
    this.log(`[relay] queued ${method} (pinned session ${pinnedSessionId} reconnecting)`);
  }

  private routeToActive(id: string, method: string): void {
    const session = this.sessions.mostActive();
    if (session === undefined) {
      this.log(`[relay] queued ${method} (no plugin connected)`);
      return;
    }
    this.pending.dispatch(id, session);
  }
}
