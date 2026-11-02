import { ErrorCode, RpcResponseSchema } from '@figma-forge/core';
import { decode, encode } from '@msgpack/msgpack';
import { afterEach, describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';

import { RPC_PATH } from '../../src/election/leader-wire.js';
import { callRpc } from './endpoint-calls.js';
import { attachFakePlugin, startLeader, stopLeaders } from './leader-harness.js';

afterEach(stopLeaders);

describe('POST /rpc', () => {
  it('honors a sessionId pin and rejects an unknown one', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    await attachFakePlugin(b, async () => ({ pinned: true }));
    const sid = b.relay.pickActiveSessionId();
    expect(typeof sid).toBe('string');

    const ok = await callRpc(b.port, {
      requestId: 'r1',
      toolName: 'get_design_context',
      sessionId: sid,
    });
    expect(ok).toMatchObject({ kind: 'ok', result: { pinned: true } });

    const bad = await callRpc(b.port, {
      requestId: 'r2',
      toolName: 'get_design_context',
      sessionId: 'ghost',
    });
    expect(bad).toMatchObject({ kind: 'err', code: ErrorCode.PluginDisconnected });
  });

  it('reports a plugin that closed mid-call as disconnected, not as a timeout', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    let plugin: WebSocket | undefined;
    plugin = await attachFakePlugin(b, async () => {
      plugin?.close(1001);
      return new Promise(() => {});
    });

    const started = Date.now();
    const res = await callRpc(b.port, { requestId: 'r3', toolName: 'get_design_context' });
    expect(res).toMatchObject({ kind: 'err', code: ErrorCode.PluginDisconnected });
    expect((res as { message: string }).message).toMatch(/plugin closed before answering/);
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it('forwards to plugin and returns its result', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    await attachFakePlugin(b, async (method, params) => {
      expect(method).toBe('get_selection');
      expect(params).toEqual({ fileKey: 'abc' });
      return { ids: ['1:1', '1:2'] };
    });

    const resp = await callRpc(b.port, {
      requestId: 'r-1',
      toolName: 'get_selection',
      args: { fileKey: 'abc' },
    });
    if (resp.kind !== 'ok') throw new Error(`expected ok, got ${resp.kind}`);
    expect(resp.requestId).toBe('r-1');
    expect(resp.result).toEqual({ ids: ['1:1', '1:2'] });
  });

  it('carries the skew warning back to the follower that asked', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    await attachFakePlugin(b, async () => ({ ok: true }), '0.0.1');

    const resp = await callRpc(b.port, {
      requestId: 'r-skew',
      toolName: 'set_fills',
      args: { nodeId: '1:1', fills: [] },
    });

    if (resp.kind !== 'ok') throw new Error(`expected ok, got ${resp.kind}`);
    expect(resp.notice).toMatch(/older than this server/i);
    expect(resp.notice).toMatch(/unverified/i);
  });

  it('attaches no warning for a current plugin', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    await attachFakePlugin(b, async () => ({ ok: true }));

    const resp = await callRpc(b.port, {
      requestId: 'r-ok',
      toolName: 'set_fills',
      args: { nodeId: '1:1', fills: [] },
    });

    if (resp.kind !== 'ok') throw new Error(`expected ok, got ${resp.kind}`);
    expect(resp.notice).toBeUndefined();
  });

  it('queues request and surfaces Timeout when no plugin ever connects', async () => {
    const b = await startLeader({ rpcTimeoutMs: 50 });
    const resp = await callRpc(b.port, {
      requestId: 'r-2',
      toolName: 'get_document',
    });
    if (resp.kind !== 'err') throw new Error(`expected err, got ${resp.kind}`);
    expect(resp.code).toBe(ErrorCode.Timeout);
    expect(resp.requestId).toBe('r-2');
  });

  it('flushes queued call once plugin connects', async () => {
    const b = await startLeader({ rpcTimeoutMs: 1_000 });
    const respPromise = callRpc(b.port, {
      requestId: 'r-flush',
      toolName: 'get_node',
      args: { nodeId: '1:1', fieldFromTheFuture: 7 },
    });

    await new Promise(r => setTimeout(r, 50));
    expect(b.relay.queuedCount()).toBe(1);

    await attachFakePlugin(b, async (method, params) => {
      expect(method).toBe('get_node');
      expect(params).toEqual({ nodeId: '1:1', fieldFromTheFuture: 7 });
      return { ok: 'flushed' };
    });

    const resp = await respPromise;
    if (resp.kind !== 'ok') throw new Error(`expected ok, got ${resp.kind}`);
    expect(resp.result).toEqual({ ok: 'flushed' });
  });

  it('returns TIMEOUT when plugin does not reply in time', async () => {
    const b = await startLeader({ rpcTimeoutMs: 50 });
    await attachFakePlugin(b, () => new Promise<never>(() => {}));

    const resp = await callRpc(b.port, { requestId: 'r-3', toolName: 'get_document' });
    if (resp.kind !== 'err') throw new Error(`expected err, got ${resp.kind}`);
    expect(resp.code).toBe(ErrorCode.Timeout);
  });

  it('rejects invalid msgpack body', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    const res = await fetch(`http://127.0.0.1:${b.port}${RPC_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/msgpack' },
      body: Buffer.from([0xff, 0xff, 0xff]),
    });
    expect(res.status).toBe(400);
  });

  it('rejects schema-invalid request', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    const res = await fetch(`http://127.0.0.1:${b.port}${RPC_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/msgpack' },
      body: Buffer.from(encode({ requestId: 'r-x' })),
    });
    expect(res.status).toBe(400);
    const buf = new Uint8Array(await res.arrayBuffer());
    const parsed = RpcResponseSchema.parse(decode(buf));
    if (parsed.kind !== 'err') throw new Error(`expected err, got ${parsed.kind}`);
    expect(parsed.code).toBe(ErrorCode.InvalidParams);
  });

  it('refuses a media type that would skip the CORS preflight', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    const res = await fetch(`http://127.0.0.1:${b.port}${RPC_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: Buffer.from(encode({ requestId: 'r-ct', toolName: 'ping' })),
    });
    expect(res.status).toBe(415);
  });
});
