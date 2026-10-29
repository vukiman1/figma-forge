import {
  createRequest,
  encodeEnvelope,
  ErrorCode,
  type ErrorEnvelope,
  type HelloResult,
  newId,
  PROTOCOL_VERSION,
  type ResponseEnvelope,
  SystemMethod,
} from '@figma-forge/core';
import { afterEach, describe, expect, it } from 'vitest';

import {
  closeCodeOf,
  connect,
  helloParams,
  nextEnvelope,
  openPlugin,
  sendHello,
  startRelay,
  stopRelays,
} from './relay-harness.js';

afterEach(stopRelays);

describe('Relay hello', () => {
  it('accepts a $hello request and returns server info', async () => {
    const { port } = await startRelay();
    const ws = await connect(port);
    ws.send(
      encodeEnvelope(
        createRequest({
          id: 'h1',
          sessionId: newId(),
          method: SystemMethod.Hello,
          params: helloParams(),
        }),
      ),
    );
    const res = (await nextEnvelope(ws)) as ResponseEnvelope;
    expect(res.kind).toBe('res');
    expect(res.id).toBe('h1');
    expect(res.result as HelloResult).toMatchObject({
      serverVersion: '1.0.0',
      protocolVersion: PROTOCOL_VERSION,
      sessionResumed: false,
    });
    ws.close();
  });

  it('rejects a first message that is not $hello and closes the socket', async () => {
    const { port } = await startRelay();
    const ws = await connect(port);
    const closed = closeCodeOf(ws);
    ws.send(
      encodeEnvelope(createRequest({ id: 'x', sessionId: newId(), method: 'something_else' })),
    );
    expect((await nextEnvelope(ws)).kind).toBe('err');
    await closed;
  });

  it('rejects $hello with bad params', async () => {
    const { port } = await startRelay();
    const ws = await connect(port);
    sendHello(ws, newId(), { clientType: 'plugin' });
    expect((await nextEnvelope(ws)).kind).toBe('err');
  });

  it('rejects a $hello with a mismatched protocolVersion and a clear ProtocolMismatch error', async () => {
    const { port } = await startRelay();
    const ws = await connect(port);
    const closed = closeCodeOf(ws);
    sendHello(ws, newId(), helloParams({ protocolVersion: '9.9.9' }));
    const res = (await nextEnvelope(ws)) as ErrorEnvelope;
    expect(res.kind).toBe('err');
    expect(res.error.code).toBe(ErrorCode.ProtocolMismatch);
    expect(res.error.message).toMatch(/protocol mismatch/i);
    await closed;
  });

  it('responds to client-initiated $ping with ok result', async () => {
    const { port } = await startRelay();
    const sessionId = newId();
    const ws = await openPlugin(port, sessionId);
    ws.send(encodeEnvelope(createRequest({ id: 'p', sessionId, method: SystemMethod.Ping })));
    const res = (await nextEnvelope(ws)) as ResponseEnvelope;
    expect(res).toMatchObject({ kind: 'res', id: 'p', result: { ok: true } });
    ws.close();
  });
});
