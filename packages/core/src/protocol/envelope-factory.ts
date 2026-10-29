import { PROTOCOL_VERSION } from './constants.js';
import type {
  ErrorEnvelope,
  EventEnvelope,
  RequestEnvelope,
  ResponseEnvelope,
} from './envelope.js';

interface EnvelopeAddress {
  id: string;
  sessionId: string;
  ts?: number;
}

interface MethodCall extends EnvelopeAddress {
  method: string;
  params?: unknown;
}

const headerOf = <K extends string>(kind: K, input: EnvelopeAddress) => ({
  v: PROTOCOL_VERSION,
  kind,
  id: input.id,
  sessionId: input.sessionId,
  ts: input.ts ?? Date.now(),
});

const paramsOf = (params: unknown): { params?: unknown } =>
  params === undefined ? {} : { params };

export const createRequest = (input: MethodCall): RequestEnvelope => ({
  ...headerOf('req', input),
  method: input.method,
  ...paramsOf(input.params),
});

export const createResponse = (
  input: EnvelopeAddress & { result?: unknown },
): ResponseEnvelope => ({
  ...headerOf('res', input),
  ...(input.result === undefined ? {} : { result: input.result }),
});

export const createError = (
  input: EnvelopeAddress & { code: string; message: string; data?: unknown },
): ErrorEnvelope => ({
  ...headerOf('err', input),
  error: {
    code: input.code,
    message: input.message,
    ...(input.data === undefined ? {} : { data: input.data }),
  },
});

export const createEvent = (input: MethodCall): EventEnvelope => ({
  ...headerOf('evt', input),
  method: input.method,
  ...paramsOf(input.params),
});
