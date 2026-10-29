import { type RpcRequest, type RpcResponse, RpcResponseSchema } from '@figma-forge/core';
import { decode, encode } from '@msgpack/msgpack';

import { ABDICATE_PATH, RPC_PATH } from '../../src/election/leader-wire.js';

export interface AbdicateReply {
  status: number;
  body: { ok: boolean; reason?: string };
}

export const postAbdicate = async (port: number, body: unknown): Promise<AbdicateReply> => {
  const res = await fetch(`http://127.0.0.1:${port}${ABDICATE_PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as AbdicateReply['body'] };
};

export const callRpc = async (port: number, req: RpcRequest): Promise<RpcResponse> => {
  const res = await fetch(`http://127.0.0.1:${port}${RPC_PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'application/msgpack' },
    body: Buffer.from(encode(req)),
  });
  return RpcResponseSchema.parse(decode(new Uint8Array(await res.arrayBuffer())));
};
