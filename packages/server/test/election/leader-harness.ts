import { createServer, type RequestListener, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import {
  createRequest,
  createResponse,
  decodeEnvelope,
  encodeEnvelope,
  type HelloParams,
  MIN_PLUGIN_VERSION,
  newId,
  PROTOCOL_VERSION,
  SystemMethod,
} from '@figma-forge/core';
import { WebSocket } from 'ws';

import {
  attachLeaderEndpoints,
  type LeaderEndpointDeps,
} from '../../src/election/leader-endpoints.js';
import { Relay } from '../../src/relay/relay.js';

export interface Bound {
  http: HttpServer;
  relay: Relay;
  port: number;
  detach: () => void;
  plugins: WebSocket[];
}

export type PluginHandler = (method: string, params: unknown) => Promise<unknown>;

const leaders: Bound[] = [];
const plainServers: HttpServer[] = [];

const listen = async (http: HttpServer): Promise<number> => {
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', () => resolve()));
  const address = http.address() as AddressInfo;
  return address.port;
};

const close = (http: HttpServer): Promise<void> =>
  new Promise<void>(resolve => http.close(() => resolve()));

export const startLeader = async (
  deps: Partial<Omit<LeaderEndpointDeps, 'relay'>> = {},
): Promise<Bound> => {
  const http = createServer();
  const port = await listen(http);
  const serverVersion = deps.serverVersion ?? '1.0.0';
  const relay = new Relay({ serverVersion, server: http });
  const detach = attachLeaderEndpoints(http, { ...deps, relay, serverVersion });
  const bound: Bound = { http, relay, port, detach, plugins: [] };
  leaders.push(bound);
  return bound;
};

export const startPlainServer = async (listener?: RequestListener): Promise<number> => {
  const http = createServer(listener);
  plainServers.push(http);
  return listen(http);
};

export const stopLeaders = async (): Promise<void> => {
  await Promise.all(
    leaders.map(async bound => {
      for (const ws of bound.plugins) ws.close();
      bound.detach();
      await bound.relay.stop();
      await close(bound.http);
    }),
  );
  leaders.length = 0;
  await Promise.all(plainServers.map(close));
  plainServers.length = 0;
};

const hello = (clientVersion: string): Uint8Array =>
  encodeEnvelope(
    createRequest({
      id: 'h',
      sessionId: newId(),
      method: SystemMethod.Hello,
      params: {
        clientType: 'plugin',
        clientVersion,
        protocolVersion: PROTOCOL_VERSION,
      } satisfies HelloParams,
    }),
  );

export const attachFakePlugin = async (
  bound: Bound,
  handle: PluginHandler,
  clientVersion: string = MIN_PLUGIN_VERSION,
): Promise<WebSocket> => {
  const ws = new WebSocket(`ws://127.0.0.1:${bound.port}`);
  ws.binaryType = 'arraybuffer';
  await new Promise<void>(resolve => ws.once('open', () => resolve()));
  const helloReceived = new Promise<void>(resolve => {
    ws.on('message', async (data: ArrayBuffer) => {
      const env = decodeEnvelope(data);
      if (env.kind === 'res') {
        resolve();
        return;
      }
      if (env.kind !== 'req' || env.method === SystemMethod.Ping) return;
      if (env.method === SystemMethod.Hello) return;
      const result = await handle(env.method, env.params);
      ws.send(encodeEnvelope(createResponse({ id: env.id, sessionId: env.sessionId, result })));
    });
  });
  ws.send(hello(clientVersion));
  await helloReceived;
  bound.plugins.push(ws);
  return ws;
};
