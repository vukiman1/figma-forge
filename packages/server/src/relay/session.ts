import type { HeartbeatMonitor } from '@figma-forge/core';
import type { WebSocket } from 'ws';

import type { PluginSessionInfo } from '../routing/sessions.js';

export enum SessionState {
  Connected = 'connected',
  Disconnected = 'disconnected',
}

export interface Session {
  id: string;
  socket: WebSocket | null;
  state: SessionState;
  clientVersion: string;
  connectedAt: number;
  reconnectedAt: number | null;
  lastActivityAt: number;
  fileName: string | null;
  pageId: string | null;
  pageName: string | null;
  heartbeat: HeartbeatMonitor | null;
  disconnectTimer: ReturnType<typeof setTimeout> | null;
  skewExplained: boolean;
}

export interface SessionRegistration {
  readonly id: string;
  readonly socket: WebSocket;
  readonly clientVersion: string;
}

export const DEFAULT_DISCONNECT_GRACE_MS = 30_000;

const REPLACED_CLOSE_CODE = 1001;

const newSession = (input: SessionRegistration, previous: Session | undefined): Session => {
  const now = Date.now();
  return {
    id: input.id,
    socket: input.socket,
    state: SessionState.Connected,
    clientVersion: input.clientVersion,
    connectedAt: previous?.connectedAt ?? now,
    reconnectedAt: previous === undefined ? null : now,
    lastActivityAt: previous?.lastActivityAt ?? now,
    fileName: previous?.fileName ?? null,
    pageId: previous?.pageId ?? null,
    pageName: previous?.pageName ?? null,
    heartbeat: null,
    disconnectTimer: null,
    skewExplained: previous?.skewExplained ?? false,
  };
};

const detach = (session: Session): void => {
  if (session.disconnectTimer !== null) clearTimeout(session.disconnectTimer);
  session.disconnectTimer = null;
  session.heartbeat?.stop();
  session.heartbeat = null;
};

const retire = (previous: Session): void => {
  detach(previous);
  if (previous.state === SessionState.Connected && previous.socket !== null) {
    previous.socket.close(REPLACED_CLOSE_CODE, 'session replaced');
  }
};

const markGone = (session: Session): void => {
  detach(session);
  session.state = SessionState.Disconnected;
  session.socket = null;
};

const toInfo = (session: Session): PluginSessionInfo => ({
  id: session.id,
  fileName: session.fileName,
  pageName: session.pageName,
  lastActivityAt: session.lastActivityAt,
  pluginVersion: session.clientVersion,
});

export const isLive = (session: Session): boolean =>
  session.state === SessionState.Connected && session.socket !== null;

export class SessionManager {
  private readonly sessions = new Map<string, Session>();

  register(input: SessionRegistration): { session: Session; resumed: boolean } {
    const previous = this.sessions.get(input.id);
    if (previous !== undefined) retire(previous);
    const session = newSession(input, previous);
    this.sessions.set(input.id, session);
    return { session, resumed: previous !== undefined };
  }

  markDisconnected(session: Session, graceMs: number): void {
    if (this.sessions.get(session.id) !== session) return;
    markGone(session);
    session.disconnectTimer = setTimeout(() => {
      if (this.sessions.get(session.id) === session) this.sessions.delete(session.id);
    }, graceMs);
  }

  end(session: Session): boolean {
    if (this.sessions.get(session.id) !== session) return false;
    markGone(session);
    this.sessions.delete(session.id);
    return true;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  list(): readonly Session[] {
    return [...this.sessions.values()];
  }

  connected(): readonly Session[] {
    return this.list().filter(isLive);
  }

  mostActive(): Session | undefined {
    return this.byActivity()[0];
  }

  infoByActivity(): readonly PluginSessionInfo[] {
    return this.byActivity().map(toInfo);
  }

  clear(): void {
    for (const session of this.sessions.values()) detach(session);
    this.sessions.clear();
  }

  private byActivity(): readonly Session[] {
    return this.connected().toSorted((a, b) => b.lastActivityAt - a.lastActivityAt);
  }
}
