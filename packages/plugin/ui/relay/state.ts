import type { ActivityPayload } from './payload.js';

export type RelayStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export type ToolHandler = (method: string, params: unknown) => Promise<unknown>;

export const ACTIVITY_LIMIT = 30;

export type ActivityStatus = 'pending' | 'ok' | 'error';

export interface ActivityEntry {
  id: string;
  method: string;
  startedAt: number;
  status: ActivityStatus;
  durationMs?: number;
  error?: string;
  request?: ActivityPayload;
  payload?: ActivityPayload;
  nodeIds?: readonly string[];
}

export interface RelayClientState {
  status: RelayStatus;
  port: number | null;
  sessionResumed: boolean;
  serverVersion: string | null;
  lastError: string | null;
  versionNotice: string | null;
  foregroundFlag: boolean;
  connectedAt: number | null;
  reconnectCount: number;
  totalCalls: number;
  failedCalls: number;
  activity: readonly ActivityEntry[];
}

export const initialRelayState = (): RelayClientState => ({
  status: 'idle',
  port: null,
  sessionResumed: false,
  serverVersion: null,
  lastError: null,
  versionNotice: null,
  foregroundFlag: false,
  connectedAt: null,
  reconnectCount: 0,
  totalCalls: 0,
  failedCalls: 0,
  activity: [],
});

export interface CallStart {
  id: string;
  method: string;
  startedAt: number;
  request?: ActivityPayload;
  nodeIds?: readonly string[];
}

export interface CallEnd {
  id: string;
  status: ActivityStatus;
  settledAt: number;
  error?: string;
  payload?: ActivityPayload;
  nodeIds?: readonly string[];
}

export const recordCallStart = (
  state: RelayClientState,
  call: CallStart,
): Partial<RelayClientState> => {
  const entry: ActivityEntry = {
    id: call.id,
    method: call.method,
    startedAt: call.startedAt,
    status: 'pending',
    ...(call.request === undefined ? {} : { request: call.request }),
    ...(call.nodeIds === undefined || call.nodeIds.length === 0 ? {} : { nodeIds: call.nodeIds }),
  };
  return {
    totalCalls: state.totalCalls + 1,
    activity: [entry, ...state.activity].slice(0, ACTIVITY_LIMIT),
  };
};

const settleEntry = (entry: ActivityEntry, call: CallEnd): ActivityEntry => {
  const nodeIds = [...new Set([...(entry.nodeIds ?? []), ...(call.nodeIds ?? [])])];
  return {
    ...entry,
    status: call.status,
    durationMs: call.settledAt - entry.startedAt,
    ...(call.error === undefined ? {} : { error: call.error }),
    ...(call.payload === undefined ? {} : { payload: call.payload }),
    ...(nodeIds.length === 0 ? {} : { nodeIds }),
  };
};

export const recordCallEnd = (
  state: RelayClientState,
  call: CallEnd,
): Partial<RelayClientState> => ({
  ...(call.status === 'error' ? { failedCalls: state.failedCalls + 1 } : {}),
  activity: state.activity.map(entry => (entry.id === call.id ? settleEntry(entry, call) : entry)),
});
