import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  ErrorCode,
  getRelayBudget,
  type RpcRequest,
  RpcRequestSchema,
  type RpcResponse,
} from '@figma-forge/core';
import { decode } from '@msgpack/msgpack';

import { errorMessage } from '../error-message.js';
import { hasContentType } from '../local-access.js';
import type { Relay } from '../relay/relay.js';
import { checkWireCall, type WireRejection } from '../tools/wire-schema.js';
import { readBody, writeJson, writeMsgpack } from './http-replies.js';
import { HttpStatus, MSGPACK_CONTENT_TYPE } from './leader-wire.js';

export interface RpcDeps {
  readonly relay: Relay;
  readonly buildId: number;
  readonly rpcTimeoutMs: number | undefined;
  readonly log: (msg: string) => void;
}

interface RpcRefusal {
  readonly status: HttpStatus;
  readonly reply: RpcResponse;
}

const DISCONNECTED_PREFIXES = [
  'no plugin connected',
  'pinned session',
  'plugin closed before answering',
] as const;

const errorReply = (requestId: string, code: ErrorCode, message: string): RpcResponse => ({
  kind: 'err',
  requestId,
  code,
  message,
});

const badRequest = (code: ErrorCode, message: string, requestId = ''): RpcRefusal => ({
  status: HttpStatus.BadRequest,
  reply: errorReply(requestId, code, message),
});

export const checkWireArgs = (req: RpcRequest, leaderBuildId: number): WireRejection | null =>
  (req.buildId ?? 0) > leaderBuildId ? null : checkWireCall(req.toolName, req.args);

const relayErrorCode = (message: string): ErrorCode => {
  if (DISCONNECTED_PREFIXES.some(prefix => message.startsWith(prefix))) {
    return ErrorCode.PluginDisconnected;
  }
  return message.includes('timeout') ? ErrorCode.Timeout : ErrorCode.Internal;
};

const parseRpc = (body: Buffer, deps: RpcDeps): RpcRequest | RpcRefusal => {
  let decoded: unknown;
  try {
    decoded = decode(body);
  } catch (error) {
    deps.log(`[leader] rpc decode error: ${errorMessage(error)}`);
    return badRequest(ErrorCode.InvalidRequest, 'invalid msgpack body');
  }
  const rpc = RpcRequestSchema.safeParse(decoded);
  if (!rpc.success) return badRequest(ErrorCode.InvalidParams, 'invalid rpc request');
  const rejection = checkWireArgs(rpc.data, deps.buildId);
  if (rejection === null) return rpc.data;
  deps.log(`[leader] refused ${rpc.data.toolName}: ${rejection.message}`);
  return badRequest(rejection.code, rejection.message, rpc.data.requestId);
};

const forward = async (rpc: RpcRequest, deps: RpcDeps): Promise<RpcResponse> => {
  const served: { notice: string | null } = { notice: null };
  try {
    const result = await deps.relay.sendRequest(
      rpc.toolName,
      rpc.args,
      deps.rpcTimeoutMs ?? getRelayBudget(rpc.toolName),
      rpc.sessionId,
      sessionId => {
        served.notice = deps.relay.skewNotice(sessionId);
      },
    );
    const { notice } = served;
    return { kind: 'ok', requestId: rpc.requestId, result, ...(notice === null ? {} : { notice }) };
  } catch (error) {
    const message = errorMessage(error);
    return errorReply(rpc.requestId, relayErrorCode(message), message);
  }
};

export const answerRpc = async (
  req: IncomingMessage,
  res: ServerResponse,
  deps: RpcDeps,
): Promise<void> => {
  if (!hasContentType(req.headers['content-type'], MSGPACK_CONTENT_TYPE)) {
    writeMsgpack(
      res,
      HttpStatus.UnsupportedMediaType,
      errorReply('', ErrorCode.InvalidRequest, `expected content-type ${MSGPACK_CONTENT_TYPE}`),
    );
    return;
  }
  let body: Buffer;
  try {
    body = await readBody(req);
  } catch (error) {
    deps.log(`[leader] rpc body read error: ${errorMessage(error)}`);
    writeJson(res, HttpStatus.BadRequest, { error: 'read body failed' });
    return;
  }
  const rpc = parseRpc(body, deps);
  if ('reply' in rpc) {
    writeMsgpack(res, rpc.status, rpc.reply);
    return;
  }
  writeMsgpack(res, HttpStatus.Ok, await forward(rpc, deps));
};
