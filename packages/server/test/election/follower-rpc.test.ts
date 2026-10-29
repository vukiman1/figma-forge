import { ErrorCode } from '@figma-forge/core';
import { decode } from '@msgpack/msgpack';
import { afterEach, describe, expect, it } from 'vitest';

import { Follower } from '../../src/election/follower.js';
import { attachFakePlugin, startLeader, stopLeaders } from './leader-harness.js';

afterEach(stopLeaders);

describe('Follower.sendRpc', () => {
  it('round-trips through leader to plugin', async () => {
    const b = await startLeader();
    await attachFakePlugin(b, async (method, params) => {
      expect(method).toBe('get_design_context');
      expect(params).toEqual({ depth: 2 });
      return { name: 'My Doc', pages: 3 };
    });

    const f = new Follower({ leaderUrl: `http://127.0.0.1:${b.port}` });
    const resp = await f.sendRpc('get_design_context', { depth: 2 }, 'r-42');
    if (resp.kind !== 'ok') throw new Error(`expected ok, got ${resp.kind}`);
    expect(resp.requestId).toBe('r-42');
    expect(resp.result).toEqual({ name: 'My Doc', pages: 3 });
  });

  it('surfaces leader-side err response', async () => {
    const b = await startLeader({ rpcTimeoutMs: 50 });
    const f = new Follower({ leaderUrl: `http://127.0.0.1:${b.port}` });
    const resp = await f.sendRpc('get_document', undefined, 'r-no-plugin');
    if (resp.kind !== 'err') throw new Error(`expected err, got ${resp.kind}`);
    expect(resp.code).toBe(ErrorCode.Timeout);
    expect(resp.requestId).toBe('r-no-plugin');
  });

  it('returns Internal err when transport fails', async () => {
    const f = new Follower({
      leaderUrl: 'http://127.0.0.1:1',
      rpcTimeoutMs: 200,
    });
    const resp = await f.sendRpc('get_document', undefined, 'r-dead');
    if (resp.kind !== 'err') throw new Error(`expected err, got ${resp.kind}`);
    expect(resp.code).toBe(ErrorCode.Internal);
    expect(resp.requestId).toBe('r-dead');
  });

  it('ends early when the caller aborts, without waiting out a 60s budget on a leader that never answers', async () => {
    const b = await startLeader();
    const f = new Follower({ leaderUrl: `http://127.0.0.1:${b.port}` });
    const abort = new AbortController();
    const started = Date.now();
    const pending = f.sendRpc('get_document', {}, 'r-abort', undefined, 60_000, abort.signal);
    setTimeout(() => abort.abort(new Error('port conflict')), 50);

    const resp = await pending;
    const elapsed = Date.now() - started;
    if (resp.kind !== 'err') throw new Error(`expected err, got ${resp.kind}`);
    expect(resp.code).toBe(ErrorCode.Internal);
    expect(resp.message).toMatch(/transport/);
    expect(elapsed).toBeLessThan(5_000);
  });

  it('still honours its own budget when no abort signal is given', async () => {
    const b = await startLeader();
    const f = new Follower({ leaderUrl: `http://127.0.0.1:${b.port}` });
    const started = Date.now();
    const resp = await f.sendRpc('get_document', {}, 'r-budget', undefined, 300);
    if (resp.kind !== 'err') throw new Error(`expected err, got ${resp.kind}`);
    expect(Date.now() - started).toBeGreaterThanOrEqual(250);
  });

  it("declares this process's build on every call, so the leader knows whether its schemas may judge it", async () => {
    const sent: unknown[] = [];
    const f = new Follower({
      leaderUrl: 'http://127.0.0.1:1',
      buildId: 4_242,
      rpcTimeoutMs: 200,
      fetch: async (_url, init) => {
        const body = init?.body as Buffer;
        sent.push(decode(new Uint8Array(body.buffer, body.byteOffset, body.byteLength)));
        throw new Error('probe');
      },
    });
    await f.sendRpc('get_document', {}, 'r-build');
    expect(sent).toEqual([
      { requestId: 'r-build', toolName: 'get_document', args: {}, buildId: 4_242 },
    ]);
  });

  it('declares 0 when this process has no build stamp, the oldest build and so the one that gets validated', async () => {
    const sent: unknown[] = [];
    const f = new Follower({
      leaderUrl: 'http://127.0.0.1:1',
      rpcTimeoutMs: 200,
      fetch: async (_url, init) => {
        const body = init?.body as Buffer;
        sent.push(decode(new Uint8Array(body.buffer, body.byteOffset, body.byteLength)));
        throw new Error('probe');
      },
    });
    await f.sendRpc('get_document', undefined, 'r-nobuild');
    expect(sent).toEqual([{ requestId: 'r-nobuild', toolName: 'get_document', buildId: 0 }]);
  });

  it('threads sessionId so the leader pins the call', async () => {
    const b = await startLeader();
    await attachFakePlugin(b, async () => ({ ok: true }));
    const sid = b.relay.pickActiveSessionId();
    const f = new Follower({ leaderUrl: `http://127.0.0.1:${b.port}` });

    const ok = await f.sendRpc('get_design_context', {}, 'r-pin', sid);
    expect(ok.kind).toBe('ok');

    const bad = await f.sendRpc('get_design_context', {}, 'r-ghost', 'ghost-session');
    if (bad.kind !== 'err') throw new Error(`expected err, got ${bad.kind}`);
    expect(bad.code).toBe(ErrorCode.PluginDisconnected);
  });
});
