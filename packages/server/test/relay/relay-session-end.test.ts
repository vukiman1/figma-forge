import { newId } from '@figma-forge/core';
import { afterEach, describe, expect, it } from 'vitest';

import {
  closeCodeOf,
  closeWith,
  connect,
  decodeFrame,
  delay,
  helloParams,
  openPlugin,
  reply,
  sendHello,
  startRelay,
  stopRelays,
} from './relay-harness.js';

afterEach(stopRelays);

const PLUGIN_HEARTBEAT_CLOSE = 4000;

const messageOf = (pending: Promise<unknown>): Promise<string> =>
  pending.then(
    () => 'resolved',
    (error: unknown) => (error instanceof Error ? error.message : String(error)),
  );

describe('Relay session end: a plugin run that is over never reconnects under its id', () => {
  it.each([
    [1001, 'the panel unloading (plugin closed or reloaded)'],
    [1000, "the plugin's own disconnect()"],
  ])('forgets a session at once when the plugin closes with %i — %s', async code => {
    const { port, relay } = await startRelay({ disconnectGraceMs: 30_000 });
    const sessionId = newId();
    const ws = await openPlugin(port, sessionId);

    await closeWith(ws, code);
    await delay(20);

    expect(relay.sessions.get(sessionId)).toBeUndefined();
    const started = Date.now();
    await expect(relay.sendRequest('get_pages', {}, 5_000, sessionId)).rejects.toThrow(
      /pinned session not connected/,
    );
    expect(Date.now() - started).toBeLessThan(500);
  });

  it('keeps the grace window and flushes a pinned request when the plugin drops its socket to reconnect', async () => {
    const { port, relay } = await startRelay({ disconnectGraceMs: 30_000 });
    const sessionId = newId();
    const ws = await openPlugin(port, sessionId);
    await closeWith(ws, PLUGIN_HEARTBEAT_CLOSE);
    await delay(20);
    expect(relay.sessions.get(sessionId)?.state).toBe('disconnected');

    const pending = relay.sendRequest('get_pages', {}, 5_000, sessionId);
    const back = await connect(port);
    back.on('message', data => {
      const envelope = decodeFrame(data);
      if (envelope.kind === 'req' && envelope.method === 'get_pages') {
        reply(back, envelope.id, sessionId, { ok: 1 });
      }
    });
    sendHello(back, sessionId, helloParams());

    await expect(pending).resolves.toEqual({ ok: 1 });
    back.close();
  });

  it('keeps the grace window when the relay itself closed the socket with 1001 for a missed heartbeat', async () => {
    const { port, relay } = await startRelay({
      heartbeatIntervalMs: 20,
      heartbeatMaxMisses: 1,
      disconnectGraceMs: 30_000,
    });
    const sessionId = newId();
    const ws = await openPlugin(port, sessionId);

    expect(await closeCodeOf(ws)).toBe(1001);
    await delay(20);
    expect(relay.sessions.get(sessionId)?.state).toBe('disconnected');
  });

  it('answers a request the plugin was still working on when it closed, instead of timing out', async () => {
    const { port, relay } = await startRelay({ disconnectGraceMs: 30_000 });
    const sessionId = newId();
    const ws = await openPlugin(port, sessionId);
    const received = new Promise<void>(resolve => {
      ws.on('message', data => {
        const envelope = decodeFrame(data);
        if (envelope.kind === 'req' && envelope.method === 'set_fills') resolve();
      });
    });
    let servedBy: string | undefined;
    const settled = messageOf(
      relay.sendRequest('set_fills', {}, 30_000, sessionId, served => {
        servedBy = served;
      }),
    );
    await received;

    const started = Date.now();
    await closeWith(ws, 1001);
    expect(await settled).toMatch(
      /plugin closed before answering \(method=set_fills\).*check whether it was applied/,
    );
    expect(Date.now() - started).toBeLessThan(500);
    expect(servedBy).toBe(sessionId);
    expect(relay.pendingCount()).toBe(0);
  });

  it('leaves a request in flight alone when the socket only dropped, since the plugin may resume', async () => {
    const { port, relay } = await startRelay({ disconnectGraceMs: 30_000 });
    const sessionId = newId();
    const ws = await openPlugin(port, sessionId);
    const settled = messageOf(relay.sendRequest('get_pages', {}, 200, sessionId));
    await delay(20);

    await closeWith(ws, PLUGIN_HEARTBEAT_CLOSE);
    expect(await settled).toMatch(/plugin request timeout/);
  });
});
