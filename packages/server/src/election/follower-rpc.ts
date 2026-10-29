import { ErrorCode, type RpcRequest, type RpcResponse, RpcResponseSchema } from '@figma-forge/core';
import { decode, encode } from '@msgpack/msgpack';

import { errorMessage } from '../error-message.js';
import { MSGPACK_CONTENT_TYPE } from './leader-wire.js';

export type FetchFn = typeof globalThis.fetch;

export interface RpcPost {
  readonly fetch: FetchFn;
  readonly url: string;
  readonly signal: AbortSignal;
  readonly log: (msg: string) => void;
}

const internalError = (requestId: string, message: string): RpcResponse => ({
  kind: 'err',
  requestId,
  code: ErrorCode.Internal,
  message,
});

const encodeRpc = (rpc: RpcRequest): Buffer => {
  const bytes = encode(rpc);
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
};

const decodeRpcResponse = (requestId: string, bytes: Uint8Array): RpcResponse => {
  let decoded: unknown;
  try {
    decoded = decode(bytes);
  } catch (error) {
    return internalError(requestId, `decode leader response: ${errorMessage(error)}`);
  }
  const parsed = RpcResponseSchema.safeParse(decoded);
  return parsed.success
    ? parsed.data
    : internalError(requestId, 'invalid rpc response from leader');
};

export const postRpc = async (rpc: RpcRequest, post: RpcPost): Promise<RpcResponse> => {
  let res: Response;
  try {
    res = await post.fetch(post.url, {
      method: 'POST',
      headers: { 'content-type': MSGPACK_CONTENT_TYPE },
      body: encodeRpc(rpc),
      signal: post.signal,
    });
  } catch (error) {
    const message = errorMessage(error);
    post.log(`[follower] rpc transport error: ${message}`);
    return internalError(rpc.requestId, `follower rpc transport: ${message}`);
  }
  return decodeRpcResponse(rpc.requestId, new Uint8Array(await res.arrayBuffer()));
};
