import { ErrorCode } from '@figma-forge/core';
import { afterEach, describe, expect, it } from 'vitest';

import { checkWireArgs } from '../../src/election/rpc-endpoint.js';
import { callRpc } from './endpoint-calls.js';
import { attachFakePlugin, startLeader, stopLeaders } from './leader-harness.js';

afterEach(stopLeaders);

describe('POST /rpc argument check', () => {
  it('refuses a tool name no sandbox handler exists for', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    let calls = 0;
    await attachFakePlugin(b, async () => {
      calls += 1;
      return { ok: true };
    });

    const resp = await callRpc(b.port, {
      requestId: 'r-unknown',
      toolName: 'definitely_not_a_tool',
    });
    if (resp.kind !== 'err') throw new Error(`expected err, got ${resp.kind}`);
    expect(resp.code).toBe(ErrorCode.MethodNotFound);
    expect(resp.message).toMatch(/definitely_not_a_tool/);
    expect(resp.requestId).toBe('r-unknown');
    expect(calls).toBe(0);
  });

  it('refuses arguments the sandbox handler could not use', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    let calls = 0;
    await attachFakePlugin(b, async () => {
      calls += 1;
      return { ok: true };
    });

    const resp = await callRpc(b.port, { requestId: 'r-bad', toolName: 'set_fills', args: {} });
    if (resp.kind !== 'err') throw new Error(`expected err, got ${resp.kind}`);
    expect(resp.code).toBe(ErrorCode.InvalidParams);
    expect(resp.message).toMatch(/set_fills/);
    expect(resp.message).toMatch(/nodeId/);
    expect(calls).toBe(0);
  });

  it('looks inside a batch, which no schema above it can describe', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    let calls = 0;
    await attachFakePlugin(b, async () => {
      calls += 1;
      return { ok: true };
    });

    const resp = await callRpc(b.port, {
      requestId: 'r-batch',
      toolName: 'batch',
      args: {
        ops: [
          { tool: 'rename_node', params: { nodeId: '1:1', name: 'fine' } },
          { tool: 'set_opacity', params: { nodeId: '1:1', opacity: 'half' } },
        ],
      },
    });
    if (resp.kind !== 'err') throw new Error(`expected err, got ${resp.kind}`);
    expect(resp.code).toBe(ErrorCode.InvalidParams);
    expect(resp.message).toMatch(/ops\[1\]/);
    expect(resp.message).toMatch(/opacity/);
    expect(calls).toBe(0);
  });

  it('forwards a batch whose ops are all well formed', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    let seen: unknown = null;
    await attachFakePlugin(b, async (_method, params) => {
      seen = params;
      return { ok: true, results: [{ ok: true }] };
    });

    const args = { ops: [{ tool: 'rename_node', params: { nodeId: '1:1', name: 'fine' } }] };
    const resp = await callRpc(b.port, { requestId: 'r-batch-ok', toolName: 'batch', args });
    expect(resp).toMatchObject({ kind: 'ok' });
    expect(seen).toEqual(args);
  });

  it('accepts a no-argument tool called with args omitted', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000 });
    await attachFakePlugin(b, async () => ({ ok: true }));
    const resp = await callRpc(b.port, { requestId: 'r-noargs', toolName: 'get_document' });
    expect(resp).toMatchObject({ kind: 'ok', result: { ok: true } });
  });

  it('does not judge a caller that declares a strictly newer build', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000, buildId: 100 });
    let seen: unknown = null;
    await attachFakePlugin(b, async (_method, params) => {
      seen = params;
      return { ok: true };
    });

    const resp = await callRpc(b.port, {
      requestId: 'r-newer',
      toolName: 'set_fills',
      args: { nodeId: '1:1', fills: { fromTheFuture: true } },
      buildId: 101,
    });
    expect(resp).toMatchObject({ kind: 'ok' });
    expect(seen).toEqual({ nodeId: '1:1', fills: { fromTheFuture: true } });
  });

  it('still checks a caller on the same build or an older one', async () => {
    const b = await startLeader({ rpcTimeoutMs: 5_000, buildId: 100 });
    await attachFakePlugin(b, async () => ({ ok: true }));

    for (const buildId of [100, 99, undefined]) {
      const resp = await callRpc(b.port, {
        requestId: `r-${String(buildId)}`,
        toolName: 'set_fills',
        args: { nodeId: '1:1', fills: { fromTheFuture: true } },
        ...(buildId === undefined ? {} : { buildId }),
      });
      if (resp.kind !== 'err') throw new Error(`expected err for buildId ${String(buildId)}`);
      expect(resp.code).toBe(ErrorCode.InvalidParams);
    }
  });
});

describe('checkWireArgs', () => {
  it('bounds how much of a bad payload it quotes back', () => {
    const rejection = checkWireArgs(
      {
        requestId: 'r',
        toolName: 'set_auto_layout',
        args: {
          nodeId: 1,
          layoutMode: 'SIDEWAYS',
          itemSpacing: 'wide',
          paddingTop: 'lots',
          primaryAxisSizingMode: 'HUGE',
        },
      },
      0,
    );
    expect(rejection?.code).toBe(ErrorCode.InvalidParams);
    expect(rejection?.message).toMatch(/\(\+\d+ more\)$/);
    expect(rejection?.message.split(';')).toHaveLength(3);
  });

  it('passes a call it has nothing to object to', () => {
    expect(
      checkWireArgs(
        { requestId: 'r', toolName: 'rename_node', args: { nodeId: '1:1', name: 'x' } },
        0,
      ),
    ).toBeNull();
  });
});
