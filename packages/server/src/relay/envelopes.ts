import {
  createError,
  createRequest,
  createResponse,
  encodeEnvelope,
  type Envelope,
  newId,
  SystemMethod,
} from '@figma-forge/core';
import type { WebSocket } from 'ws';

export interface OutgoingRequest {
  readonly id: string;
  readonly sessionId: string;
  readonly method: string;
  readonly params?: unknown;
}

export interface ErrorReply {
  readonly code: string;
  readonly message: string;
  readonly data?: unknown;
}

export const sendRequest = (socket: WebSocket, request: OutgoingRequest): void => {
  socket.send(encodeEnvelope(createRequest(request)));
};

export const sendResponse = (socket: WebSocket, request: Envelope, result: unknown): void => {
  socket.send(
    encodeEnvelope(createResponse({ id: request.id, sessionId: request.sessionId, result })),
  );
};

export const sendError = (socket: WebSocket, request: Envelope, reply: ErrorReply): void => {
  socket.send(
    encodeEnvelope(
      createError({
        id: request.id || newId(),
        sessionId: request.sessionId || newId(),
        code: reply.code,
        message: reply.message,
        ...(reply.data === undefined ? {} : { data: reply.data }),
      }),
    ),
  );
};

export const sendPing = (socket: WebSocket, sessionId: string): void => {
  socket.ping();
  sendRequest(socket, { id: newId(), sessionId, method: SystemMethod.Ping });
};
