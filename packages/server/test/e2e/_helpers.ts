import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Readable } from 'node:stream';

import {
  createError,
  createRequest,
  createResponse,
  decodeEnvelope,
  encodeEnvelope,
  ErrorCode,
  MIN_PLUGIN_VERSION,
  newId,
  PROTOCOL_VERSION,
  SystemMethod,
} from '@figma-forge/core';
import { WebSocket } from 'ws';

import { Follower } from '../../src/election/follower.js';
import { attachLeaderEndpoints } from '../../src/election/leader-endpoints.js';
import { Node } from '../../src/election/node.js';

export interface LeaderHarness {
  node: Node;
  follower: Follower;
  port: number;
  detach: () => void;
}

export const freePort = async (): Promise<number> => {
  const s = createServer();
  await new Promise<void>(resolve => s.listen(0, '127.0.0.1', () => resolve()));
  const port = (s.address() as AddressInfo).port;
  await new Promise<void>(resolve => s.close(() => resolve()));
  return port;
};

export const startLeader = async (serverVersion = 'e2e-1.0.0'): Promise<LeaderHarness> => {
  const port = await freePort();
  const node = new Node({ serverVersion, port });
  const follower = new Follower({ leaderUrl: `http://127.0.0.1:${port}` });
  const res = await node.becomeLeader();
  const detach = attachLeaderEndpoints(res.http, {
    relay: res.relay,
    serverVersion,
  });
  return { node, follower, port, detach };
};

export const stopLeader = async (h: LeaderHarness): Promise<void> => {
  h.detach();
  await h.node.stop();
};

export interface FakePluginOptions {
  port: number;
  sessionId?: string;
  handlers: Record<string, (params: unknown) => unknown>;

  clientVersion?: string;
}

export const connectFakePlugin = async (opts: FakePluginOptions): Promise<WebSocket> => {
  const sessionId = opts.sessionId ?? newId();
  const ws = new WebSocket(`ws://127.0.0.1:${opts.port}`);

  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error): void => reject(err);
    ws.once('error', onError);
    ws.once('open', () => {
      ws.off('error', onError);
      const helloId = 'fake-hello-1';
      const onMessage = (raw: WebSocket.RawData): void => {
        const env = decodeEnvelope(raw as Uint8Array);
        if (env.kind === 'res' && env.id === helloId) {
          ws.off('message', onMessage);
          resolve();
        }
      };
      ws.on('message', onMessage);
      ws.send(
        encodeEnvelope(
          createRequest({
            id: helloId,
            sessionId,
            method: SystemMethod.Hello,
            params: {
              clientType: 'plugin',

              clientVersion: opts.clientVersion ?? MIN_PLUGIN_VERSION,
              protocolVersion: PROTOCOL_VERSION,
            },
          }),
        ),
      );
    });
  });

  ws.on('message', raw => {
    const env = decodeEnvelope(raw as Uint8Array);
    if (env.kind !== 'req') return;
    if (env.method === SystemMethod.Ping) {
      ws.send(
        encodeEnvelope(
          createResponse({ id: env.id, sessionId: env.sessionId, result: { ok: true } }),
        ),
      );
      return;
    }
    const handler = opts.handlers[env.method];
    if (handler === undefined) {
      ws.send(
        encodeEnvelope(
          createError({
            id: env.id,
            sessionId: env.sessionId,
            code: ErrorCode.MethodNotFound,
            message: `no sandbox handler (method=${env.method})`,
          }),
        ),
      );
      return;
    }
    const result = handler(env.params);
    ws.send(encodeEnvelope(createResponse({ id: env.id, sessionId: env.sessionId, result })));
  });

  return ws;
};

export const closeSocket = (ws: WebSocket): void => {
  if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
    ws.close();
  }
};

export const onText = (stream: Readable, listener: (text: string) => void): void => {
  stream.setEncoding('utf8');
  stream.on('data', listener);
};
