import { type Envelope, type RequestEnvelope, SystemMethod } from '@figma-forge/core';

import { decodeMessage, encodePingReply } from './envelopes.js';
import { errorMessage } from './error-message.js';

export interface LiveSocketHooks {
  readonly log: (msg: string) => void;
  readonly onReceived: () => void;
  readonly onToolRequest: (request: RequestEnvelope) => void;
  readonly onClosed: () => void;
  readonly onError: () => void;
}

const decodeLive = (event: MessageEvent, log: (msg: string) => void): Envelope | null => {
  try {
    return decodeMessage(event);
  } catch (error) {
    log(`[relay-client] decode error on live socket: ${errorMessage(error)}`);
    return null;
  }
};

const routeMessage = (ws: WebSocket, event: MessageEvent, hooks: LiveSocketHooks): void => {
  const envelope = decodeLive(event, hooks.log);
  if (envelope === null) return;
  hooks.onReceived();
  if (envelope.kind === 'req' && envelope.method === SystemMethod.Ping) {
    ws.send(encodePingReply(envelope));
    return;
  }
  if (envelope.kind === 'req') {
    hooks.onToolRequest(envelope);
    return;
  }
  hooks.log(`[relay-client] <- ${envelope.kind} ${'method' in envelope ? envelope.method : ''}`);
};

export const bindLiveSocket = (ws: WebSocket, hooks: LiveSocketHooks): void => {
  ws.onmessage = event => routeMessage(ws, event, hooks);
  ws.onclose = () => hooks.onClosed();
  ws.onerror = () => hooks.onError();
};
