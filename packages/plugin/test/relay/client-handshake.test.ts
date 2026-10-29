import { ErrorCode, type HelloParams, newId, PROTOCOL_VERSION } from '@figma-forge/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RelayClient } from '../../ui/relay/client.js';
import {
  acceptHello,
  buildFakeFactory,
  connectWithLiveSocket,
  helloRequestOf,
  rejectHello,
} from './relay-socket-fake.js';

describe('RelayClient handshake', () => {
  it('connects, sends hello, and reaches connected state', async () => {
    const { WS, sockets } = buildFakeFactory(sock => acceptHello(sock));
    const client = new RelayClient({ ports: [3055], clientVersion: '0.0.0', WS });
    const seen: string[] = [];
    client.subscribe(s => seen.push(s.status));

    await client.connect();

    expect(client.getState().status).toBe('connected');
    expect(client.getState().port).toBe(3055);
    expect(client.getState().sessionResumed).toBe(false);
    expect(seen).toContain('connecting');
    expect(seen).toContain('connected');
    const helloReq = helloRequestOf(sockets[0]!);
    const params = helloReq.params as HelloParams;
    expect(helloReq.method).toBe('$hello');
    expect(params.clientType).toBe('plugin');
    expect(params.protocolVersion).toBe(PROTOCOL_VERSION);
  });

  it('falls back to next port when first port refuses', async () => {
    const { WS, sockets } = buildFakeFactory((sock, port) => {
      if (port === 3055) sock.fireServerClose(1006, 'connection refused');
      else acceptHello(sock);
    });

    const client = new RelayClient({ ports: [3055, 3056], clientVersion: '0.0.0', WS });
    await client.connect();

    expect(client.getState().port).toBe(3056);
    expect(sockets).toHaveLength(2);
  });

  it('treats an error reply to hello as that port failing and tries the next', async () => {
    const { WS, sockets } = buildFakeFactory((sock, port) => {
      if (port === 3055) rejectHello(sock, ErrorCode.InvalidParams, 'bad params');
      else acceptHello(sock);
    });

    const client = new RelayClient({ ports: [3055, 3056], clientVersion: '0.0.0', WS });
    await client.connect();

    expect(client.getState().port).toBe(3056);
    expect(sockets).toHaveLength(2);
  });

  it('keeps a hello rejection reason in lastError instead of the generic no-server message', async () => {
    const { WS } = buildFakeFactory(sock =>
      rejectHello(
        sock,
        ErrorCode.ProtocolMismatch,
        'protocol mismatch: server speaks 0.1.0, plugin speaks 9.9.9 — update …',
      ),
    );
    const client = new RelayClient({
      ports: [3055],
      clientVersion: '0.0.0',
      WS,
      reconnectInitialDelayMs: 5,
    });

    await client.connect();

    expect(client.getState().lastError).toMatch(/protocol mismatch/i);
    await client.disconnect();
  });

  it('shows the skew warning from a successful hello as a notice that survives the connect, not as an error', async () => {
    const { WS } = buildFakeFactory(sock =>
      acceptHello(sock, {
        skewNotice: 'Figma Forge plugin v0.3.0 is older than this server (v0.4.0).',
      }),
    );
    const client = new RelayClient({ ports: [3055], clientVersion: '0.3.0', WS });

    await client.connect();

    expect(client.getState().status).toBe('connected');
    expect(client.getState().versionNotice).toMatch(/older than this server/i);
    expect(client.getState().lastError).toBeNull();
    await client.disconnect();
  });

  it('leaves the banner clear when the server reports no skew', async () => {
    const { WS } = buildFakeFactory(sock => acceptHello(sock));
    const client = new RelayClient({ ports: [3055], clientVersion: '0.4.0', WS });

    await client.connect();

    expect(client.getState().versionNotice).toBeNull();
    await client.disconnect();
  });

  it('records the server version from the hello handshake', async () => {
    const { client } = await connectWithLiveSocket();

    expect(client.getState().serverVersion).toBe('1.0.0');
  });

  it('offers the given sessionId in hello so the server can resume that session', async () => {
    const sessionId = newId();
    const { WS, sockets } = buildFakeFactory(sock => acceptHello(sock, { sessionResumed: true }));
    const client = new RelayClient({ ports: [3055], clientVersion: '0.0.0', sessionId, WS });

    await client.connect();

    expect(helloRequestOf(sockets[0]!).sessionId).toBe(sessionId);
    expect(client.getState().sessionResumed).toBe(true);
  });
});

describe('RelayClient handshake budgets', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits out a handshake that Chromium throttles past the 1s hello budget, since hurrying it feeds the throttle', async () => {
    vi.useFakeTimers();
    const { WS } = buildFakeFactory(sock => {
      setTimeout(() => acceptHello(sock), 3_000);
    });
    const client = new RelayClient({ ports: [3055], clientVersion: '0.0.0', WS });

    const connecting = client.connect();
    await vi.advanceTimersByTimeAsync(4_000);
    await connecting;

    expect(client.getState().status).toBe('connected');
    await client.disconnect();
  });

  it('abandons a socket that opens but stays silent for the 1s hello budget, as a port owner mid-handoff does', async () => {
    vi.useFakeTimers();
    const logged: string[] = [];
    const { WS } = buildFakeFactory(sock => sock.fireOpen());
    const client = new RelayClient({
      ports: [3055],
      clientVersion: '0.0.0',
      WS,
      log: msg => logged.push(msg),
    });

    const connecting = client.connect();
    await vi.advanceTimersByTimeAsync(1_000);
    await connecting;

    expect(logged.some(m => m.includes('hello timeout on port 3055'))).toBe(true);
    await client.disconnect();
  });

  it('gives up on a handshake that never opens, as from a foreign process on the port, only after the 15s connect budget', async () => {
    vi.useFakeTimers();
    const logged: string[] = [];
    const { WS } = buildFakeFactory(() => {});
    const client = new RelayClient({
      ports: [3055],
      clientVersion: '0.0.0',
      WS,
      log: msg => logged.push(msg),
    });

    const connecting = client.connect();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(logged.some(m => m.includes('timeout'))).toBe(false);
    await vi.advanceTimersByTimeAsync(15_000);
    await connecting;

    expect(logged.some(m => m.includes('connect timeout on port 3055'))).toBe(true);
    await client.disconnect();
  });
});
