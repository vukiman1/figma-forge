import { afterEach, describe, expect, it } from 'vitest';

import { ABDICATE_PATH } from '../../src/election/leader-wire.js';
import { postAbdicate } from './endpoint-calls.js';
import { startLeader, stopLeaders } from './leader-harness.js';

afterEach(stopLeaders);

describe('POST /abdicate', () => {
  it('refuses a non-JSON media type', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    const res = await fetch(`http://127.0.0.1:${b.port}${ABDICATE_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ buildId: 999_999 }),
    });
    expect(res.status).toBe(415);
  });

  it('accepts a strictly newer build and releases after the response flushes', async () => {
    let released = 0;
    const b = await startLeader({
      rpcTimeoutMs: 5_000,
      buildId: 100,
      onAbdicate: () => {
        released += 1;
      },
      abdicateQuietWindowMs: 0,
    });
    const { status, body } = await postAbdicate(b.port, { buildId: 200 });
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
    await new Promise(r => setTimeout(r, 20));
    expect(released).toBe(1);
  });

  it('refuses an equal or older build', async () => {
    let released = 0;
    const b = await startLeader({
      rpcTimeoutMs: 5_000,
      buildId: 100,
      onAbdicate: () => {
        released += 1;
      },
      abdicateQuietWindowMs: 0,
    });
    expect((await postAbdicate(b.port, { buildId: 100 })).body).toEqual({
      ok: false,
      reason: 'stale',
    });
    expect((await postAbdicate(b.port, { buildId: 50 })).body).toEqual({
      ok: false,
      reason: 'stale',
    });
    expect(released).toBe(0);
  });

  it('answers unsupported when no release hook is wired', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000, buildId: 100, abdicateQuietWindowMs: 0 });
    expect((await postAbdicate(b.port, { buildId: 200 })).body).toEqual({
      ok: false,
      reason: 'unsupported',
    });
  });

  it('defers while a relay request is in flight', async () => {
    let released = 0;
    const b = await startLeader({
      rpcTimeoutMs: 5_000,
      buildId: 100,
      onAbdicate: () => {
        released += 1;
      },
      abdicateQuietWindowMs: 0,
    });
    const pending = b.relay.sendRequest('slow_tool', {}, 1_000).catch(() => {});
    await new Promise(r => setTimeout(r, 20));
    expect((await postAbdicate(b.port, { buildId: 200 })).body).toEqual({
      ok: false,
      reason: 'busy',
    });
    expect(released).toBe(0);
    await pending;
  });

  it('defers inside the quiet window after recent traffic, then accepts once it elapses', async () => {
    let released = 0;
    const b = await startLeader({
      rpcTimeoutMs: 5_000,
      buildId: 100,
      onAbdicate: () => {
        released += 1;
      },
      abdicateQuietWindowMs: 150,
    });
    await b.relay.sendRequest('quick_tool', {}, 10).catch(() => {});
    expect((await postAbdicate(b.port, { buildId: 200 })).body).toEqual({
      ok: false,
      reason: 'busy',
    });
    expect(released).toBe(0);

    await new Promise(r => setTimeout(r, 160));
    expect((await postAbdicate(b.port, { buildId: 200 })).body).toEqual({ ok: true });
    await new Promise(r => setTimeout(r, 20));
    expect(released).toBe(1);
  });

  it('rejects malformed bodies', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000, buildId: 100, abdicateQuietWindowMs: 0 });
    expect((await postAbdicate(b.port, 'not json{{')).status).toBe(400);
    expect((await postAbdicate(b.port, {})).status).toBe(400);
    expect((await postAbdicate(b.port, { buildId: 'newest' })).status).toBe(400);
  });
});
