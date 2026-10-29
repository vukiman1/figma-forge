import { decodeEnvelope, type Envelope } from '@figma-forge/core';
import type { RawData, WebSocket } from 'ws';

import { errorMessage } from '../error-message.js';
import type { Session } from './session.js';

export interface ConnectionHandlers {
  readonly log: (msg: string) => void;
  readonly onHello: (socket: WebSocket, envelope: Envelope) => Session | undefined;
  readonly onEnvelope: (session: Session, envelope: Envelope) => void;
  readonly onClose: (session: Session, socket: WebSocket, code: number) => void;
}

const HELLO_TIMEOUT_MS = 5_000;
const UNSUPPORTED_DATA_CLOSE_CODE = 1003;
const POLICY_VIOLATION_CLOSE_CODE = 1008;

class NonBinaryFrameError extends Error {
  constructor() {
    super('expected a binary frame');
    this.name = 'NonBinaryFrameError';
  }
}

const decodeFrame = (raw: RawData): Envelope => {
  if (!(raw instanceof Uint8Array)) throw new NonBinaryFrameError();
  return decodeEnvelope(raw);
};

const decodeOrClose = (
  socket: WebSocket,
  raw: RawData,
  log: ConnectionHandlers['log'],
): Envelope | undefined => {
  try {
    return decodeFrame(raw);
  } catch (error) {
    log(`[relay] decode error: ${errorMessage(error)}`);
    socket.close(UNSUPPORTED_DATA_CLOSE_CODE, 'invalid envelope');
    return undefined;
  }
};

export const attachConnection = (socket: WebSocket, handlers: ConnectionHandlers): void => {
  socket.binaryType = 'nodebuffer';
  let session: Session | undefined;
  const helloTimer = setTimeout(() => {
    if (session !== undefined) return;
    handlers.log('[relay] hello timeout, closing socket');
    socket.close(POLICY_VIOLATION_CLOSE_CODE, 'hello timeout');
  }, HELLO_TIMEOUT_MS);

  socket.on('pong', () => {
    if (session?.socket === socket) session.heartbeat?.notifyReceived();
  });
  socket.on('message', raw => {
    const envelope = decodeOrClose(socket, raw, handlers.log);
    if (envelope === undefined) return;
    if (session !== undefined) {
      handlers.onEnvelope(session, envelope);
      return;
    }
    clearTimeout(helloTimer);
    session = handlers.onHello(socket, envelope);
    if (session === undefined) socket.close(POLICY_VIOLATION_CLOSE_CODE, 'hello failed');
  });
  socket.on('close', (code: number) => {
    clearTimeout(helloTimer);
    if (session !== undefined) handlers.onClose(session, socket, code);
  });
  socket.on('error', error => handlers.log(`[relay] socket error: ${error.message}`));
};
