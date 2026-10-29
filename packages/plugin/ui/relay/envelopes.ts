import {
  type ActivityParams,
  createError,
  createEvent,
  createRequest,
  createResponse,
  decodeEnvelope,
  encodeEnvelope,
  type Envelope,
  type HelloParams,
  newId,
  PROTOCOL_VERSION,
  type RequestEnvelope,
  SystemMethod,
} from '@figma-forge/core';

export type EncodedEnvelope = ReturnType<typeof encodeEnvelope>;

export const decodeMessage = (event: MessageEvent): Envelope =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the socket's binaryType is arraybuffer, so every frame arrives as one
  decodeEnvelope(event.data as ArrayBuffer);

export const encodeHello = (sessionId: string, clientVersion: string): EncodedEnvelope => {
  const params: HelloParams = {
    clientType: 'plugin',
    clientVersion,
    protocolVersion: PROTOCOL_VERSION,
  };
  return encodeEnvelope(
    createRequest({ id: newId(), sessionId, method: SystemMethod.Hello, params }),
  );
};

export const encodePing = (sessionId: string): EncodedEnvelope =>
  encodeEnvelope(createRequest({ id: newId(), sessionId, method: SystemMethod.Ping }));

export const encodePingReply = (ping: RequestEnvelope): EncodedEnvelope =>
  encodeEnvelope(createResponse({ id: ping.id, sessionId: ping.sessionId, result: { ok: true } }));

export const encodeActivity = (sessionId: string, params: ActivityParams): EncodedEnvelope =>
  encodeEnvelope(createEvent({ id: newId(), sessionId, method: SystemMethod.Activity, params }));

export const encodeToolResult = (request: RequestEnvelope, result: unknown): EncodedEnvelope =>
  encodeEnvelope(createResponse({ id: request.id, sessionId: request.sessionId, result }));

export const encodeToolError = (
  request: RequestEnvelope,
  code: string,
  message: string,
): EncodedEnvelope =>
  encodeEnvelope(createError({ id: request.id, sessionId: request.sessionId, code, message }));
