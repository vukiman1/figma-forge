export const PING_PATH = '/ping';
export const RPC_PATH = '/rpc';
export const ABDICATE_PATH = '/abdicate';

export const JSON_CONTENT_TYPE = 'application/json';
export const MSGPACK_CONTENT_TYPE = 'application/msgpack';

export const HttpStatus = {
  Ok: 200,
  BadRequest: 400,
  Forbidden: 403,
  NotFound: 404,
  UnsupportedMediaType: 415,
} as const;

export type HttpStatus = (typeof HttpStatus)[keyof typeof HttpStatus];

export enum AbdicateReason {
  Busy = 'busy',
  Stale = 'stale',
  Unsupported = 'unsupported',
  Invalid = 'invalid',
  UnsupportedMediaType = 'unsupported media type',
}
