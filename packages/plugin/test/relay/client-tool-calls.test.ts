import { createRequest, ErrorCode, type ResponseEnvelope, SystemMethod } from '@figma-forge/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PluginToolFailure } from '../../protocol/bridge.js';
import { RelayClient } from '../../ui/relay/client.js';
import { ACTIVITY_LIMIT, type ToolHandler } from '../../ui/relay/state.js';
import {
  acceptHello,
  buildFakeFactory,
  connectWithLiveSocket,
  type FakeSocketControl,
  lastSent,
  lastSentError,
  wait,
} from './relay-socket-fake.js';

const callTool = (
  live: FakeSocketControl,
  client: RelayClient,
  id: string,
  method: string,
  params?: unknown,
): void => {
  live.fireReceive(createRequest({ id, sessionId: client.sessionId, method, params }));
};

describe('RelayClient tool calls', () => {
  it('responds to server-initiated $ping with ok result', async () => {
    const { client, live } = await connectWithLiveSocket();
    const sentBeforePing = live.sent.length;

    callTool(live, client, 'srv-ping-1', SystemMethod.Ping);

    expect(live.sent.length).toBe(sentBeforePing + 1);
    const reply = lastSent(live) as ResponseEnvelope;
    expect(reply.kind).toBe('res');
    expect(reply.id).toBe('srv-ping-1');
    expect(reply.result).toEqual({ ok: true });
  });

  it('dispatches non-system req to registered tool handler and replies with res', async () => {
    const handler = vi.fn<ToolHandler>(async (method, params) => ({
      received: { method, params },
    }));
    const { client, live } = await connectWithLiveSocket(handler);
    const sentBefore = live.sent.length;

    callTool(live, client, 'tool-1', 'ping', { hello: 'world' });
    await wait(5);

    expect(handler).toHaveBeenCalledWith('ping', { hello: 'world' });
    expect(live.sent.length).toBe(sentBefore + 1);
    expect(lastSent(live)).toMatchObject({
      kind: 'res',
      id: 'tool-1',
      result: { received: { method: 'ping', params: { hello: 'world' } } },
    });
  });

  it('replies METHOD_NOT_FOUND and records an error entry when no tool handler is registered', async () => {
    const { client, live } = await connectWithLiveSocket();

    callTool(live, client, 'tool-2', 'ping');
    await wait(5);

    expect(lastSent(live)).toMatchObject({ kind: 'err', id: 'tool-2' });
    expect(lastSentError(live).code).toBe(ErrorCode.MethodNotFound);
    expect(client.getState().activity[0]).toMatchObject({ id: 'tool-2', status: 'error' });
  });

  it('replies INTERNAL_ERROR when the tool handler throws', async () => {
    const { client, live } = await connectWithLiveSocket(async () => {
      throw new Error('sandbox blew up');
    });

    callTool(live, client, 'tool-3', 'ping');
    await wait(5);

    expect(lastSentError(live).code).toBe(ErrorCode.Internal);
    expect(lastSentError(live).message).toContain('sandbox blew up');
  });

  it("carries the sandbox's own error code instead of relabelling it Internal, so the server prefixes the code exactly once", async () => {
    const { client, live } = await connectWithLiveSocket(async () => {
      throw new PluginToolFailure(ErrorCode.MethodNotFound, 'no sandbox handler (method=ping)');
    });

    callTool(live, client, 'tool-4', 'ping');
    await wait(5);

    expect(lastSentError(live)).toMatchObject({
      code: ErrorCode.MethodNotFound,
      message: 'no sandbox handler (method=ping)',
    });
  });
});

describe('RelayClient activity', () => {
  it('records a successful tool call in activity with ok status and duration', async () => {
    const { client, live } = await connectWithLiveSocket(async () => ({ ok: true }));

    callTool(live, client, 't-1', 'get_pages');
    await wait(5);

    const s = client.getState();
    expect(s.totalCalls).toBe(1);
    expect(s.activity).toHaveLength(1);
    expect(s.activity[0]).toMatchObject({ id: 't-1', method: 'get_pages', status: 'ok' });
    expect(s.activity[0]?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('captures the result payload (what the LLM receives) on a successful call', async () => {
    const result = { pages: [{ id: '0:1', name: 'Page 1' }] };
    const { client, live } = await connectWithLiveSocket(async () => result);

    callTool(live, client, 't-p', 'get_pages');
    await wait(5);

    const payload = client.getState().activity[0]?.payload;
    expect(payload?.preview).toContain('"name": "Page 1"');
    expect(payload?.bytes).toBe(JSON.stringify(result).length);
    expect(payload?.truncated).toBe(false);
  });

  it('captures the request params at call start', async () => {
    const { client, live } = await connectWithLiveSocket(async () => ({ ok: true }));

    callTool(live, client, 't-r', 'get_design_context', { nodeId: '3:21', detail: 'full' });
    await wait(5);

    const request = client.getState().activity[0]?.request;
    expect(request?.preview).toContain('"nodeId": "3:21"');
    expect(request?.preview).toContain('"detail": "full"');
  });

  it('records the node a create call names only in its result', async () => {
    const { client, live } = await connectWithLiveSocket(async () => ({ ok: true, nodeId: '9:9' }));

    callTool(live, client, 't-c', 'create_frame', { name: 'Card' });
    await wait(5);

    expect(client.getState().activity[0]?.nodeIds).toEqual(['9:9']);
  });

  it('records a throwing tool call as an error with its message and no payload', async () => {
    const { client, live } = await connectWithLiveSocket(async () => {
      throw new Error('boom');
    });

    callTool(live, client, 't-2', 'get_node');
    await wait(5);

    const entry = client.getState().activity[0];
    expect(entry).toMatchObject({ id: 't-2', method: 'get_node', status: 'error' });
    expect(entry?.error).toContain('boom');
    expect(entry?.payload).toBeUndefined();
  });

  it('keeps activity most-recent-first and capped at ACTIVITY_LIMIT', async () => {
    const { client, live } = await connectWithLiveSocket(async () => ({ ok: true }));
    const total = ACTIVITY_LIMIT + 5;

    for (let i = 0; i < total; i += 1) callTool(live, client, `t-${i}`, `m_${i}`);
    await wait(20);

    const s = client.getState();
    expect(s.totalCalls).toBe(total);
    expect(s.activity).toHaveLength(ACTIVITY_LIMIT);
    expect(s.activity[0]?.method).toBe(`m_${total - 1}`);
  });
});

describe('RelayClient heartbeat', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts sending a tool reply as proof of life, so the stall of encoding a large result cannot trip the heartbeat', async () => {
    vi.useFakeTimers();
    let finishCall: (result: unknown) => void = () => {};
    const { WS, sockets } = buildFakeFactory(sock => acceptHello(sock));
    const client = new RelayClient({
      ports: [3055],
      clientVersion: '0.0.0',
      WS,
      heartbeatIntervalMs: 100,
      heartbeatMaxMisses: 2,
    });
    client.setToolHandler(
      () =>
        new Promise(resolve => {
          finishCall = resolve;
        }),
    );
    await client.connect();
    await vi.advanceTimersByTimeAsync(150);

    callTool(sockets[0]!, client, 't-slow', 'get_document');
    await vi.advanceTimersByTimeAsync(210);
    finishCall({ ok: true });
    await vi.advanceTimersByTimeAsync(50);

    expect(client.getState().status).toBe('connected');
    await client.disconnect();
  });
});
