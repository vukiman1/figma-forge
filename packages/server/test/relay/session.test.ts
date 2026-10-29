import { HeartbeatMonitor } from '@figma-forge/core';
import { describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';

import { SessionManager } from '../../src/relay/session.js';

const fakeSocket = (): WebSocket => ({ close: () => {} }) as unknown as WebSocket;

describe('SessionManager.clear', () => {
  it('stops session heartbeats itself, since Relay.stop clears sessions before their sockets close and a leaked interval keeps the process alive', () => {
    vi.useFakeTimers();
    try {
      const manager = new SessionManager();
      const { session } = manager.register({
        id: 's1',
        socket: fakeSocket(),
        clientVersion: '0.0.0',
      });
      const sendPing = vi.fn<() => void>();
      session.heartbeat = new HeartbeatMonitor({
        intervalMs: 10,
        maxMisses: 2,
        sendPing,
        onTimeout: () => {},
      });
      session.heartbeat.start();

      manager.clear();

      vi.advanceTimersByTime(100);
      expect(sendPing).not.toHaveBeenCalled();
      expect(session.heartbeat).toBe(null);
    } finally {
      vi.useRealTimers();
    }
  });
});
