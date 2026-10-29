import { ErrorCode } from '@figma-forge/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RelayClient } from '../../ui/relay/client.js';
import { acceptHello, buildFakeFactory, rejectHello, wait } from './relay-socket-fake.js';

const failFirstAttempt = (): Parameters<typeof buildFakeFactory>[0] => {
  let attempt = 0;
  return sock => {
    attempt += 1;
    if (attempt === 1) sock.fireServerClose(1006, 'refused');
    else acceptHello(sock);
  };
};

const resumeAfterFirst = (): Parameters<typeof buildFakeFactory>[0] => {
  let attempt = 0;
  return sock => {
    attempt += 1;
    acceptHello(sock, { sessionResumed: attempt > 1 });
  };
};

describe('RelayClient reconnect', () => {
  it('keeps retrying in the background when no server is up yet, with a message that also covers a foreign process on the port', async () => {
    const { WS } = buildFakeFactory(sock => sock.fireServerClose(1006, 'refused'));
    const client = new RelayClient({
      ports: [3055, 3056],
      clientVersion: '0.0.0',
      WS,
      reconnectInitialDelayMs: 5,
      log: vi.fn<(msg: string) => void>(),
    });

    await expect(client.connect()).resolves.toBeUndefined();

    expect(client.getState().status).toBe('reconnecting');
    expect(client.getState().lastError).toMatch(/no Figma Forge server on :3055/);
    expect(client.getState().lastError).toMatch(/another process may be holding that port/);
    await client.disconnect();
  });

  it('connects on its own once the server appears after the plugin, counting it as a first connection rather than a reconnect', async () => {
    const { WS, sockets } = buildFakeFactory(failFirstAttempt());
    const client = new RelayClient({
      ports: [3055],
      clientVersion: '0.0.0',
      WS,
      reconnectInitialDelayMs: 5,
    });
    const seen: string[] = [];
    client.subscribe(s => seen.push(s.status));

    await client.connect();
    expect(client.getState().status).toBe('reconnecting');
    await wait(50);

    expect(client.getState().status).toBe('connected');
    expect(client.getState().reconnectCount).toBe(0);
    expect(seen).toContain('reconnecting');
    expect(sockets.length).toBeGreaterThanOrEqual(2);
    await client.disconnect();
  });

  it('wake() probes at once instead of sitting out a back-off that a hidden tab’s throttled timers stretch', async () => {
    const { WS } = buildFakeFactory(failFirstAttempt());
    const client = new RelayClient({
      ports: [3055],
      clientVersion: '0.0.0',
      WS,
      reconnectInitialDelayMs: 1_000,
    });

    await client.connect();
    expect(client.getState().status).toBe('reconnecting');
    client.wake();
    await wait(50);

    expect(client.getState().status).toBe('connected');
    expect(client.getState().reconnectCount).toBe(0);
    await client.disconnect();
  });

  it('wake() leaves a healthy connection alone instead of opening another probe socket', async () => {
    const { WS, sockets } = buildFakeFactory(sock => acceptHello(sock));
    const client = new RelayClient({ ports: [3055], clientVersion: '0.0.0', WS });
    await client.connect();
    expect(client.getState().status).toBe('connected');

    client.wake();
    await wait(20);

    expect(client.getState().status).toBe('connected');
    expect(sockets).toHaveLength(1);
    await client.disconnect();
  });

  it('stops retrying once a server refuses this build, instead of re-offering the rejected handshake several times a second', async () => {
    const { WS, sockets } = buildFakeFactory(sock =>
      rejectHello(
        sock,
        ErrorCode.ProtocolMismatch,
        'plugin too old: this server (v0.4.0) needs the Figma Forge plugin at v0.4.0',
      ),
    );
    const client = new RelayClient({
      ports: [3055],
      clientVersion: '0.3.0',
      WS,
      reconnectInitialDelayMs: 1,
    });

    await client.connect();
    const afterConnect = sockets.length;
    await wait(250);

    expect(sockets.length).toBe(afterConnect);
    expect(client.getState().versionNotice).toMatch(/plugin too old/i);
    expect(client.getState().status).toBe('disconnected');
    await client.disconnect();
  });

  it('keeps retrying when the server is merely absent', async () => {
    const { WS, sockets } = buildFakeFactory(sock => sock.fireServerClose(1006));
    const client = new RelayClient({
      ports: [3055],
      clientVersion: '0.4.0',
      WS,
      reconnectInitialDelayMs: 1,
    });

    await client.connect();
    const afterConnect = sockets.length;
    await wait(250);

    expect(sockets.length).toBeGreaterThan(afterConnect);
    expect(client.getState().versionNotice).toBeNull();
    await client.disconnect();
  });

  it('reconnects automatically after server closes the live socket', async () => {
    const { WS, sockets } = buildFakeFactory(resumeAfterFirst());
    const client = new RelayClient({
      ports: [3055],
      clientVersion: '0.0.0',
      WS,
      reconnectInitialDelayMs: 5,
    });
    const seen: string[] = [];
    client.subscribe(s => seen.push(s.status));
    await client.connect();
    expect(client.getState().status).toBe('connected');

    sockets[0]!.fireServerClose(1001, 'leader gone');
    await wait(50);

    expect(client.getState().status).toBe('connected');
    expect(client.getState().sessionResumed).toBe(true);
    expect(sockets.length).toBeGreaterThanOrEqual(2);
    expect(seen).toContain('reconnecting');
    await client.disconnect();
  });

  it('does not reconnect after explicit disconnect()', async () => {
    const { WS, sockets } = buildFakeFactory(sock => acceptHello(sock));
    const client = new RelayClient({
      ports: [3055],
      clientVersion: '0.0.0',
      WS,
      reconnectInitialDelayMs: 5,
    });

    await client.connect();
    await client.disconnect();
    await wait(30);

    expect(sockets).toHaveLength(1);
    expect(client.getState().status).toBe('disconnected');
  });

  it('tracks connectedAt and bumps reconnectCount only when a live socket was re-established', async () => {
    const { WS, sockets } = buildFakeFactory(resumeAfterFirst());
    const client = new RelayClient({
      ports: [3055],
      clientVersion: '0.0.0',
      WS,
      reconnectInitialDelayMs: 5,
    });
    await client.connect();
    expect(client.getState().connectedAt).toBeTypeOf('number');
    expect(client.getState().reconnectCount).toBe(0);

    sockets[0]!.fireServerClose(1001, 'leader gone');
    await wait(50);

    expect(client.getState().status).toBe('connected');
    expect(client.getState().reconnectCount).toBe(1);
    expect(client.getState().connectedAt).toBeTypeOf('number');
    await client.disconnect();
    expect(client.getState().connectedAt).toBeNull();
  });
});

describe('RelayClient back-off pacing', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls a cold start once a second, under the floor of Chromium’s failed-handshake throttle', async () => {
    vi.useFakeTimers();
    const { WS, sockets } = buildFakeFactory(sock => sock.fireServerClose(1006));
    const client = new RelayClient({ ports: [3055], clientVersion: '0.0.0', WS });
    await client.connect();
    await vi.advanceTimersByTimeAsync(10_000);

    const before = sockets.length;
    await vi.advanceTimersByTimeAsync(5_000);

    expect(sockets.length - before).toBe(5);
    await client.disconnect();
  });

  it('eases a dropped live socket back to the 5s ceiling, since a real fault is not an imminent arrival', async () => {
    vi.useFakeTimers();
    let attempt = 0;
    const { WS, sockets } = buildFakeFactory(sock => {
      attempt += 1;
      if (attempt === 1) acceptHello(sock);
      else sock.fireServerClose(1006);
    });
    const client = new RelayClient({ ports: [3055], clientVersion: '0.0.0', WS });
    await client.connect();
    sockets[0]!.fireServerClose(1001, 'leader gone');
    await vi.advanceTimersByTimeAsync(20_000);

    const before = sockets.length;
    await vi.advanceTimersByTimeAsync(10_000);

    expect(sockets.length - before).toBe(2);
    await client.disconnect();
  });

  it('restarts the back-off from its floor after a wake, so a user who just came back keeps getting quick probes', async () => {
    vi.useFakeTimers();
    const { WS, sockets } = buildFakeFactory(sock => sock.fireServerClose(1006));
    const client = new RelayClient({ ports: [3055], clientVersion: '0.0.0', WS });
    await client.connect();
    await vi.advanceTimersByTimeAsync(2_000);

    const before = sockets.length;
    client.wake();
    await vi.advanceTimersByTimeAsync(300);

    expect(sockets.length - before).toBe(2);
    await client.disconnect();
  });
});
