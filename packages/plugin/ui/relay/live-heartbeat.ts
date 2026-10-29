import { HeartbeatMonitor } from '@figma-forge/core';

import { encodePing } from './envelopes.js';

const HEARTBEAT_TIMEOUT_CLOSE_CODE = 4000;

export interface LiveHeartbeatConfig {
  readonly intervalMs: number;
  readonly maxMisses: number;
  readonly sessionId: string;
  readonly log: (msg: string) => void;
}

export const startLiveHeartbeat = (
  ws: WebSocket,
  config: LiveHeartbeatConfig,
): HeartbeatMonitor => {
  const heartbeat = new HeartbeatMonitor({
    intervalMs: config.intervalMs,
    maxMisses: config.maxMisses,
    sendPing: () => {
      ws.send(encodePing(config.sessionId));
    },
    onTimeout: () => {
      config.log('[relay-client] heartbeat timeout, closing socket');
      ws.close(HEARTBEAT_TIMEOUT_CLOSE_CODE, 'heartbeat timeout');
    },
  });
  heartbeat.start();
  return heartbeat;
};
