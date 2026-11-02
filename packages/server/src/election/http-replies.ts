import type { IncomingMessage, ServerResponse } from 'node:http';

import type { RpcResponse } from '@figma-forge/core';
import { encode } from '@msgpack/msgpack';

import { parseJson } from '../parse-json.js';
import { type HttpStatus, JSON_CONTENT_TYPE, MSGPACK_CONTENT_TYPE } from './leader-wire.js';

export const readBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

export const readJsonBody = (req: IncomingMessage): Promise<unknown> =>
  readBody(req).then(
    body => parseJson(body.toString('utf8')),
    () => undefined,
  );

const writeBytes = (
  res: ServerResponse,
  status: HttpStatus,
  contentType: string,
  body: Buffer,
): void => {
  res.writeHead(status, {
    'content-type': contentType,
    'content-length': body.byteLength.toString(),
  });
  res.end(body);
};

export const writeJson = (res: ServerResponse, status: HttpStatus, body: unknown): void => {
  writeBytes(res, status, JSON_CONTENT_TYPE, Buffer.from(JSON.stringify(body)));
};

export const writeMsgpack = (res: ServerResponse, status: HttpStatus, body: RpcResponse): void => {
  const bytes = encode(body);
  writeBytes(
    res,
    status,
    MSGPACK_CONTENT_TYPE,
    Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength),
  );
};
