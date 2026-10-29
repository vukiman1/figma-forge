import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import {
  createEvent,
  createRequest,
  createResponse,
  decodeEnvelope,
  encodeEnvelope,
  type Envelope,
  type HelloParams,
  type HelloResult,
  MIN_PLUGIN_VERSION,
  newId,
  PROTOCOL_VERSION,
  type ResponseEnvelope,
  SystemMethod,
} from '@figma-forge/core';
import { type RawData, WebSocket } from 'ws';

import { Relay, type RelayOptions } from '../../src/relay/relay.js';

export interface BoundRelay {
  relay: Relay;
  server: HttpServer;
  port: number;
  logs: string[];
}

type RelayTuning = Pick<
  RelayOptions,
  'heartbeatIntervalMs' | 'heartbeatMaxMisses' | 'disconnectGraceMs'
>;

const bound: BoundRelay[] = [];

export const stopRelays = async (): Promise<void> => {
  await Promise.all(
    bound.map(async b => {
      await b.relay.stop();
      await new Promise<void>(resolve => b.server.close(() => resolve()));
    }),
  );
  bound.length = 0;
};

export const startRelay = async (tuning: RelayTuning = {}): Promise<BoundRelay> => {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
  const logs: string[] = [];
  const relay = new Relay({
    serverVersion: '1.0.0',
    server,
    log: msg => logs.push(msg),
    heartbeatIntervalMs: tuning.heartbeatIntervalMs ?? 60_000,
    heartbeatMaxMisses: tuning.heartbeatMaxMisses ?? 2,
    disconnectGraceMs: tuning.disconnectGraceMs ?? 30_000,
  });
  const b: BoundRelay = { relay, server, port: (server.address() as AddressInfo).port, logs };
  bound.push(b);
  return b;
};

export const delay = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

export const connect = (port: number): Promise<WebSocket> =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`, { autoPong: false });
    ws.binaryType = 'arraybuffer';
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });

export const decodeFrame = (data: RawData): Envelope => decodeEnvelope(data as ArrayBuffer);

export const nextEnvelope = (ws: WebSocket): Promise<Envelope> =>
  new Promise((resolve, reject) => {
    ws.once('message', data => resolve(decodeFrame(data)));
    ws.once('error', reject);
  });

export const helloParams = (overrides: Partial<HelloParams> = {}): HelloParams => ({
  clientType: 'plugin',
  clientVersion: MIN_PLUGIN_VERSION,
  protocolVersion: PROTOCOL_VERSION,
  ...overrides,
});

export const sendHello = (ws: WebSocket, sessionId: string, params: unknown): void => {
  ws.send(
    encodeEnvelope(createRequest({ id: newId(), sessionId, method: SystemMethod.Hello, params })),
  );
};

export const hello = async (
  ws: WebSocket,
  sessionId: string,
  overrides: Partial<HelloParams> = {},
): Promise<HelloResult> => {
  sendHello(ws, sessionId, helloParams(overrides));
  const reply = (await nextEnvelope(ws)) as ResponseEnvelope;
  return reply.result as HelloResult;
};

export const openPlugin = async (
  port: number,
  sessionId: string = newId(),
  overrides: Partial<HelloParams> = {},
): Promise<WebSocket> => {
  const ws = await connect(port);
  await hello(ws, sessionId, overrides);
  return ws;
};

export const sendActivity = (ws: WebSocket, sessionId: string, params: unknown): void => {
  ws.send(
    encodeEnvelope(createEvent({ id: newId(), sessionId, method: SystemMethod.Activity, params })),
  );
};

export const reply = (ws: WebSocket, id: string, sessionId: string, result: unknown): void => {
  ws.send(encodeEnvelope(createResponse({ id, sessionId, result })));
};

export const answerToolCalls = (ws: WebSocket, sessionId: string, result: unknown): void => {
  ws.on('message', data => {
    const envelope = decodeFrame(data);
    if (envelope.kind === 'req' && envelope.method !== SystemMethod.Ping) {
      reply(ws, envelope.id, sessionId, result);
    }
  });
};

export const collectToolCalls = (ws: WebSocket): Envelope[] => {
  const calls: Envelope[] = [];
  ws.on('message', data => {
    const envelope = decodeFrame(data);
    if (envelope.kind === 'req' && envelope.method !== SystemMethod.Ping) calls.push(envelope);
  });
  return calls;
};

export const closeWith = (ws: WebSocket, code: number): Promise<void> =>
  new Promise(resolve => {
    ws.once('close', () => resolve());
    ws.close(code);
  });

export const closeCodeOf = (ws: WebSocket): Promise<number> =>
  new Promise(resolve => ws.once('close', code => resolve(code)));

export const upgradeStatus = (ws: WebSocket): Promise<number> =>
  new Promise((resolve, reject) => {
    ws.once('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0));
    ws.once('open', () => reject(new Error('upgrade should have been refused')));
    ws.once('error', () => resolve(0));
  });
