import { type Envelope, newId, SystemMethod } from '@figma-forge/core';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

import {
  answerToolCalls,
  closeCodeOf,
  connect,
  decodeFrame,
  delay,
  hello,
  openPlugin,
  reply,
  startRelay,
  stopRelays,
} from './relay-harness.js';

afterEach(stopRelays);

const GOING_AWAY = 1001;

const firstPing = (ws: WebSocket): Promise<Envelope> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no heartbeat ping within 2s')), 2000);
    ws.on('message', data => {
      const envelope = decodeFrame(data);
      if (envelope.kind !== 'req' || envelope.method !== SystemMethod.Ping) return;
      clearTimeout(timer);
      resolve(envelope);
    });
  });

describe('Relay heartbeat', () => {
  it('closes the socket when the plugin answers neither application nor transport pings', async () => {
    const { port } = await startRelay({ heartbeatIntervalMs: 30, heartbeatMaxMisses: 2 });
    const ws = await openPlugin(port);

    expect(await closeCodeOf(ws)).toBe(GOING_AWAY);
  });

  it('sends heartbeat pings to an idle plugin', async () => {
    const { port } = await startRelay({ heartbeatIntervalMs: 20, heartbeatMaxMisses: 1000 });
    const ws = await openPlugin(port);

    expect(await firstPing(ws)).toMatchObject({ kind: 'req', method: SystemMethod.Ping });
    ws.close();
  });

  it('keeps the connection alive past the timeout window while the plugin answers $ping', async () => {
    const { port } = await startRelay({ heartbeatIntervalMs: 60, heartbeatMaxMisses: 3 });
    const sessionId = newId();
    const ws = await openPlugin(port, sessionId);
    let isClosed = false;
    ws.once('close', () => {
      isClosed = true;
    });
    ws.on('message', data => {
      const envelope = decodeFrame(data);
      if (envelope.kind === 'req' && envelope.method === SystemMethod.Ping) {
        reply(ws, envelope.id, sessionId, { ok: true });
      }
    });

    await delay(300);
    expect(isClosed).toBe(false);
    ws.close();
  });

  it('keeps a background plugin alive on transport pongs alone, since a throttled iframe may not run its JS', async () => {
    const { relay, port } = await startRelay({ heartbeatIntervalMs: 30, heartbeatMaxMisses: 3 });
    const sessionId = newId();
    const ws = await connect(port);
    let pings = 0;
    ws.on('ping', data => {
      pings += 1;
      ws.pong(data);
    });
    await hello(ws, sessionId);

    await delay(300);
    expect(pings).toBeGreaterThan(0);
    expect(ws.readyState).toBe(WebSocket.OPEN);
    expect(relay.sessions.connected().map(s => s.id)).toContain(sessionId);
    ws.close();
  });

  it('defers the heartbeat timeout while a request is in flight, since a plugin busy encoding a reply is not dead', async () => {
    const { relay, port } = await startRelay({ heartbeatIntervalMs: 30, heartbeatMaxMisses: 2 });
    const sessionId = newId();
    const ws = await openPlugin(port, sessionId);
    const inflight = relay.sendRequest('get_screenshot', { nodeIds: ['1:2'] }, 60_000, sessionId);
    inflight.catch(() => {});
    let isClosed = false;
    ws.once('close', () => {
      isClosed = true;
    });

    await delay(300);
    expect(isClosed).toBe(false);
    expect(relay.heartbeatDeferralCount()).toBeGreaterThan(0);
    ws.close();
  });

  it('resumes closing the socket once the in-flight request resolves', async () => {
    const { relay, port } = await startRelay({ heartbeatIntervalMs: 30, heartbeatMaxMisses: 2 });
    const sessionId = newId();
    const ws = await openPlugin(port, sessionId);
    answerToolCalls(ws, sessionId, { ok: true });

    await relay.sendRequest('get_screenshot', { nodeIds: ['1:2'] }, 60_000, sessionId);

    expect(await closeCodeOf(ws)).toBe(GOING_AWAY);
  });
});
