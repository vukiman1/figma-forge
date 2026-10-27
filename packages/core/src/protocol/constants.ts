export const PROTOCOL_VERSION = '0.1.0';

export const DEFAULT_PORT = 3056;

export const ErrorCode = {
  InvalidRequest: 'INVALID_REQUEST',
  MethodNotFound: 'METHOD_NOT_FOUND',
  InvalidParams: 'INVALID_PARAMS',
  Internal: 'INTERNAL_ERROR',
  Timeout: 'TIMEOUT',
  PluginDisconnected: 'PLUGIN_DISCONNECTED',
  NotLeader: 'NOT_LEADER',
  SessionUnknown: 'SESSION_UNKNOWN',
  ProtocolMismatch: 'PROTOCOL_MISMATCH',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const SystemMethod = {
  Hello: '$hello',
  Ping: '$ping',
  Echo: '$echo',
  Activity: '$activity',
} as const;
export type SystemMethod = (typeof SystemMethod)[keyof typeof SystemMethod];

declare const crypto: { randomUUID?: () => string } | undefined;
export const newId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
