import { HEARTBEAT_INTERVAL_MS, HEARTBEAT_MAX_MISSES } from '@figma-forge/core';

export type WebSocketCtor = new (url: string) => WebSocket;

export interface RelayClientOptions {
  readonly ports: readonly number[];
  readonly clientVersion: string;
  readonly sessionId?: string;
  readonly host?: string;
  readonly WS?: WebSocketCtor;
  readonly log?: (msg: string) => void;
  readonly helloTimeoutMs?: number;
  readonly connectTimeoutMs?: number;
  readonly heartbeatIntervalMs?: number;
  readonly heartbeatMaxMisses?: number;
  readonly reconnectInitialDelayMs?: number;
  readonly reconnectMaxDelayMs?: number;
}

export type ResolvedRelayOptions = Readonly<Required<Omit<RelayClientOptions, 'sessionId'>>>;

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_HELLO_TIMEOUT_MS = 1_000;
const DEFAULT_CONNECT_TIMEOUT_MS = 15_000;
const DEFAULT_RECONNECT_INITIAL_DELAY_MS = 250;
const DEFAULT_RECONNECT_MAX_DELAY_MS = 5_000;

const discardLog = (): void => {};

export const resolveRelayOptions = (opts: RelayClientOptions): ResolvedRelayOptions => ({
  ports: opts.ports,
  clientVersion: opts.clientVersion,
  host: opts.host ?? DEFAULT_HOST,
  WS: opts.WS ?? globalThis.WebSocket,
  log: opts.log ?? discardLog,
  helloTimeoutMs: opts.helloTimeoutMs ?? DEFAULT_HELLO_TIMEOUT_MS,
  connectTimeoutMs: opts.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS,
  heartbeatIntervalMs: opts.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS,
  heartbeatMaxMisses: opts.heartbeatMaxMisses ?? HEARTBEAT_MAX_MISSES,
  reconnectInitialDelayMs: opts.reconnectInitialDelayMs ?? DEFAULT_RECONNECT_INITIAL_DELAY_MS,
  reconnectMaxDelayMs: opts.reconnectMaxDelayMs ?? DEFAULT_RECONNECT_MAX_DELAY_MS,
});
