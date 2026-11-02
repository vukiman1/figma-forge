import type { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http';

import { isAllowedHost, isAllowedHttpOrigin } from '../local-access.js';
import type { Relay } from '../relay/relay.js';
import { ABDICATE_QUIET_WINDOW_MS, answerAbdicate } from './abdicate-endpoint.js';
import { writeJson } from './http-replies.js';
import { ABDICATE_PATH, HttpStatus, PING_PATH, RPC_PATH } from './leader-wire.js';
import { answerPing } from './ping-endpoint.js';
import { answerRpc } from './rpc-endpoint.js';

export interface LeaderEndpointDeps {
  relay: Relay;
  serverVersion: string;
  buildId?: number;
  onAbdicate?: () => void;
  log?: (msg: string) => void;
  rpcTimeoutMs?: number;
  abdicateQuietWindowMs?: number;
}

type Endpoint = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;

interface AccessRefusal {
  readonly detail: string;
  readonly error: string;
}

const accessRefusalOf = (req: IncomingMessage): AccessRefusal | undefined => {
  const { host, origin } = req.headers;
  if (!isAllowedHost(host)) return { detail: `for host ${host ?? ''}`, error: 'forbidden host' };
  if (!isAllowedHttpOrigin(origin)) {
    return { detail: `from origin ${origin ?? ''}`, error: 'forbidden origin' };
  }
  return undefined;
};

const routeOf = (req: IncomingMessage): string => `${req.method ?? '?'} ${req.url ?? '?'}`;

const endpointsFor = (deps: LeaderEndpointDeps): ReadonlyMap<string, Endpoint> => {
  const { relay, serverVersion } = deps;
  const buildId = deps.buildId ?? 0;
  const log = deps.log ?? ((): void => {});
  const quietWindowMs = deps.abdicateQuietWindowMs ?? ABDICATE_QUIET_WINDOW_MS;
  return new Map<string, Endpoint>([
    [`GET ${PING_PATH}`, (_req, res) => answerPing(res, { relay, serverVersion, buildId })],
    [
      `POST ${ABDICATE_PATH}`,
      (req, res) =>
        answerAbdicate(req, res, {
          relay,
          buildId,
          onAbdicate: deps.onAbdicate,
          quietWindowMs,
          log,
        }),
    ],
    [
      `POST ${RPC_PATH}`,
      (req, res) => answerRpc(req, res, { relay, buildId, rpcTimeoutMs: deps.rpcTimeoutMs, log }),
    ],
  ]);
};

export const attachLeaderEndpoints = (http: HttpServer, deps: LeaderEndpointDeps): (() => void) => {
  const endpoints = endpointsFor(deps);
  const log = deps.log ?? ((): void => {});
  const handler = (req: IncomingMessage, res: ServerResponse): void => {
    const refusal = accessRefusalOf(req);
    if (refusal !== undefined) {
      log(`[leader] refused ${routeOf(req)} ${refusal.detail}`);
      writeJson(res, HttpStatus.Forbidden, { error: refusal.error });
      return;
    }
    const endpoint = endpoints.get(routeOf(req));
    if (endpoint === undefined) {
      writeJson(res, HttpStatus.NotFound, { error: 'not found' });
      return;
    }
    void endpoint(req, res);
  };
  http.on('request', handler);
  return (): void => {
    http.removeListener('request', handler);
  };
};
