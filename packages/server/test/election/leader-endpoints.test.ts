import { request as httpRequest } from 'node:http';

import { encode } from '@msgpack/msgpack';
import { afterEach, describe, expect, it } from 'vitest';

import { ABDICATE_PATH, PING_PATH, RPC_PATH } from '../../src/election/leader-wire.js';
import { attachFakePlugin, startLeader, stopLeaders } from './leader-harness.js';

afterEach(stopLeaders);

describe('leader endpoints', () => {
  it('GET /ping returns server info and plugin count', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    const res = await fetch(`http://127.0.0.1:${b.port}${PING_PATH}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; serverVersion: string; plugins: number };
    expect(body.ok).toBe(true);
    expect(body.serverVersion).toBe('1.0.0');
    expect(body.plugins).toBe(0);

    await attachFakePlugin(b, async () => ({ noop: true }));
    const res2 = await fetch(`http://127.0.0.1:${b.port}${PING_PATH}`);
    const body2 = (await res2.json()) as { plugins: number };
    expect(body2.plugins).toBe(1);
  });

  it('GET /ping exposes activeSessionId for follower-side pin resolution', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    const res = await fetch(`http://127.0.0.1:${b.port}${PING_PATH}`);
    const body = (await res.json()) as { activeSessionId: string | null };
    expect(body.activeSessionId).toBeNull();

    await attachFakePlugin(b, async () => ({ noop: true }));
    const res2 = await fetch(`http://127.0.0.1:${b.port}${PING_PATH}`);
    const body2 = (await res2.json()) as { activeSessionId: string | null };
    expect(body2.activeSessionId).toBe(b.relay.pickActiveSessionId());
    expect(typeof body2.activeSessionId).toBe('string');
  });

  it('GET /ping advertises the buildId (0 when unset)', async () => {
    const bare = await startLeader({ rpcTimeoutMs: 5_000 });
    const bareBody = (await (await fetch(`http://127.0.0.1:${bare.port}${PING_PATH}`)).json()) as {
      buildId: number;
    };
    expect(bareBody.buildId).toBe(0);

    const stamped = await startLeader({ rpcTimeoutMs: 5_000, buildId: 1234 });
    const stampedBody = (await (
      await fetch(`http://127.0.0.1:${stamped.port}${PING_PATH}`)
    ).json()) as { buildId: number };
    expect(stampedBody.buildId).toBe(1234);
  });

  it('GET on unknown path returns 404', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    const res = await fetch(`http://127.0.0.1:${b.port}/nope`);
    expect(res.status).toBe(404);
  });

  it('refuses any request carrying an Origin, since only browsers send one', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    const attach = await attachFakePlugin(b, () => Promise.resolve({ pong: true }));
    expect(attach).toBeDefined();

    const rpc = await fetch(`http://127.0.0.1:${b.port}${RPC_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain', origin: 'https://evil.example' },
      body: Buffer.from(encode({ requestId: 'r-csrf', toolName: 'ping' })),
    });
    expect(rpc.status).toBe(403);

    const ping = await fetch(`http://127.0.0.1:${b.port}${PING_PATH}`, {
      headers: { origin: 'https://evil.example' },
    });
    expect(ping.status).toBe(403);

    const abdicate = await fetch(`http://127.0.0.1:${b.port}${ABDICATE_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
      body: JSON.stringify({ buildId: 999_999 }),
    });
    expect(abdicate.status).toBe(403);
  });

  it('refuses a request addressed to a rebound domain, on the readable GET path too', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });

    const status = await new Promise<number>((resolve, reject) => {
      const req = httpRequest(
        {
          host: '127.0.0.1',
          port: b.port,
          path: PING_PATH,
          method: 'GET',
          headers: { host: 'evil.example:' + String(b.port) },
        },
        res => {
          res.resume();
          resolve(res.statusCode ?? 0);
        },
      );
      req.on('error', reject);
      req.end();
    });
    expect(status).toBe(403);
  });
});
