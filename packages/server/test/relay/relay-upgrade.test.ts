import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

import { startRelay, stopRelays, upgradeStatus } from './relay-harness.js';

afterEach(stopRelays);

describe('Relay server errors', () => {
  it('logs an EMFILE the HTTP server raises instead of letting the unheard error end the process', async () => {
    const { server, logs } = await startRelay();

    expect(() =>
      server.emit('error', Object.assign(new Error('accept EMFILE'), { code: 'EMFILE' })),
    ).not.toThrow();
    expect(logs).toContain('[relay] server error: accept EMFILE');
  });
});

describe('Relay upgrade gating', () => {
  it('refuses a WebSocket upgrade from a web page before it can claim a plugin session', async () => {
    const b = await startRelay();
    const ws = new WebSocket(`ws://127.0.0.1:${b.port}`, {
      headers: { origin: 'https://evil.example' },
    });

    expect(await upgradeStatus(ws)).toBe(403);
    expect(b.relay.sessions.connected()).toHaveLength(0);
  });

  it('refuses an upgrade addressed to a rebound domain', async () => {
    const b = await startRelay();
    const ws = new WebSocket(`ws://127.0.0.1:${b.port}`, {
      headers: { host: `evil.example:${b.port}` },
    });

    expect(await upgradeStatus(ws)).toBe(403);
  });

  it('admits the plugin, whose sandboxed origin is the literal "null"', async () => {
    const b = await startRelay();
    const ws = new WebSocket(`ws://127.0.0.1:${b.port}`, { headers: { origin: 'null' } });
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve());
      ws.once('error', reject);
    });
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });
});
