import type { Server as HttpServer } from 'node:http';

import {
  checkPluginCompatibility,
  type Envelope,
  type HeartbeatMonitor,
  SystemMethod,
} from '@figma-forge/core';
import { type WebSocket, WebSocketServer } from 'ws';

import { applyActivity } from './activity.js';
import { attachConnection } from './connection.js';
import { sendError, sendResponse } from './envelopes.js';
import { helloResult, HelloVerdict, negotiateHello } from './hello.js';
import type { PendingRequests } from './pending-requests.js';
import { startSessionHeartbeat } from './session-heartbeat.js';
import type { Session, SessionManager } from './session.js';
import { createUpgradeGuard } from './upgrade-guard.js';

export interface PluginConnectionsOptions {
  readonly server: HttpServer;
  readonly serverVersion: string;
  readonly log: (msg: string) => void;
  readonly heartbeatIntervalMs: number;
  readonly heartbeatMaxMisses: number;
  readonly disconnectGraceMs: number;
}

const PLUGIN_ENDED_CLOSE_CODES: ReadonlySet<number> = new Set([1000, 1001]);
const HEARTBEAT_TIMEOUT_CLOSE_CODE = 1001;

const pluginClosedError = (method: string): Error =>
  new Error(
    `plugin closed before answering (method=${method}) — it was closed or reloaded ` +
      'in Figma; if this call writes, check whether it was applied before retrying',
  );

export class PluginConnections {
  private readonly wss: WebSocketServer;
  private readonly closedByServer = new WeakSet<WebSocket>();
  private heartbeatDeferrals = 0;

  constructor(
    private readonly sessions: SessionManager,
    private readonly pending: PendingRequests,
    private readonly options: PluginConnectionsOptions,
  ) {
    this.wss = new WebSocketServer({
      server: options.server,
      verifyClient: createUpgradeGuard(options.log),
    });
    this.wss.on('connection', socket =>
      attachConnection(socket, {
        log: options.log,
        onHello: (helloSocket, envelope) => this.handleHello(helloSocket, envelope),
        onEnvelope: (session, envelope) => this.handleEnvelope(session, envelope),
        onClose: (session, closedSocket, code) => this.handleClose(session, closedSocket, code),
      }),
    );
    this.wss.on('error', error => options.log(`[relay] server error: ${error.message}`));
  }

  heartbeatDeferralCount(): number {
    return this.heartbeatDeferrals;
  }

  async close(): Promise<void> {
    for (const client of this.wss.clients) client.terminate();
    await new Promise<void>(resolve => this.wss.close(() => resolve()));
  }

  private handleHello(socket: WebSocket, envelope: Envelope): Session | undefined {
    const outcome = negotiateHello(envelope);
    if (outcome.verdict === HelloVerdict.Rejected) {
      this.options.log(`[relay] rejecting plugin — ${outcome.reply.message}`);
      sendError(socket, envelope, outcome.reply);
      return undefined;
    }
    const { clientVersion } = outcome.params;
    this.warnIfSkewed(clientVersion);
    const { session, resumed } = this.sessions.register({
      id: envelope.sessionId,
      socket,
      clientVersion,
    });
    session.heartbeat = this.startHeartbeat(session, socket);
    sendResponse(
      socket,
      envelope,
      helloResult(outcome.params, this.options.serverVersion, resumed),
    );
    this.options.log(`[relay] session ${session.id} hello (resumed=${resumed})`);
    const flushed = this.pending.flushTo(session);
    if (flushed > 0) {
      this.options.log(`[relay] flushed ${flushed} queued request(s) to session ${session.id}`);
    }
    return session;
  }

  private handleEnvelope(session: Session, envelope: Envelope): void {
    session.heartbeat?.notifyReceived();
    if (envelope.kind === 'evt' && envelope.method === SystemMethod.Activity) {
      applyActivity(session, envelope.params);
      return;
    }
    if (envelope.kind === 'req' && envelope.method === SystemMethod.Ping) {
      if (session.socket !== null) sendResponse(session.socket, envelope, { ok: true });
      return;
    }
    if (envelope.kind === 'res') {
      this.pending.answer(envelope.id, envelope.result);
      return;
    }
    if (envelope.kind === 'err') {
      const { code, message } = envelope.error;
      this.pending.refuse(envelope.id, new Error(`${code}: ${message}`));
      return;
    }
    this.options.log(`[relay] session ${session.id} <- ${envelope.kind} ${envelope.method}`);
  }

  private handleClose(session: Session, socket: WebSocket, code: number): void {
    if (!this.closedByServer.has(socket) && PLUGIN_ENDED_CLOSE_CODES.has(code)) {
      this.endSession(session, code);
      return;
    }
    const graceMs = this.options.disconnectGraceMs;
    this.options.log(
      `[relay] session ${session.id} disconnected (code ${code}, grace ${graceMs}ms)`,
    );
    this.sessions.markDisconnected(session, graceMs);
  }

  private endSession(session: Session, code: number): void {
    if (!this.sessions.end(session)) return;
    this.pending.abandonSession(session.id, pluginClosedError);
    this.options.log(`[relay] session ${session.id} ended (plugin closed, code ${code})`);
  }

  private startHeartbeat(session: Session, socket: WebSocket): HeartbeatMonitor {
    const { log } = this.options;
    return startSessionHeartbeat(socket, session.id, {
      intervalMs: this.options.heartbeatIntervalMs,
      maxMisses: this.options.heartbeatMaxMisses,
      isBusy: () => this.pending.hasInflight(session.id),
      onDeferred: () => {
        this.heartbeatDeferrals += 1;
        log(`[relay] heartbeat timeout deferred — session ${session.id} busy (in-flight)`);
      },
      onDead: () => {
        log(`[relay] session ${session.id} heartbeat timeout`);
        this.closedByServer.add(socket);
        socket.close(HEARTBEAT_TIMEOUT_CLOSE_CODE, 'heartbeat timeout');
      },
    });
  }

  private warnIfSkewed(clientVersion: string): void {
    if (checkPluginCompatibility(clientVersion, this.options.serverVersion)) return;
    this.options.log(
      `[relay] plugin "${clientVersion}" predates this server (v${this.options.serverVersion}); ` +
        'serving it, and marking every result as unverified',
    );
  }
}
