import { HeartbeatMonitor } from '@figma-forge/core';
import type { WebSocket } from 'ws';

import { sendPing } from './envelopes.js';

export interface SessionHeartbeatConfig {
  readonly intervalMs: number;
  readonly maxMisses: number;
  readonly isBusy: () => boolean;
  readonly onDeferred: () => void;
  readonly onDead: () => void;
}

export const startSessionHeartbeat = (
  socket: WebSocket,
  sessionId: string,
  config: SessionHeartbeatConfig,
): HeartbeatMonitor => {
  const heartbeat: HeartbeatMonitor = new HeartbeatMonitor({
    intervalMs: config.intervalMs,
    maxMisses: config.maxMisses,
    sendPing: () => sendPing(socket, sessionId),
    onTimeout: () => {
      if (!config.isBusy()) {
        config.onDead();
        return;
      }
      config.onDeferred();
      heartbeat.start();
    },
  });
  heartbeat.start();
  return heartbeat;
};
