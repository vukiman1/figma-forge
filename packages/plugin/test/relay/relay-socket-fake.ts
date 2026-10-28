import {
  createError,
  createResponse,
  decodeEnvelope,
  encodeEnvelope,
  type Envelope,
  type HelloResult,
  PROTOCOL_VERSION,
  type RequestEnvelope,
} from '@figma-forge/core';

import type { WebSocketCtor } from '../../ui/relay/client-options.js';
import { RelayClient } from '../../ui/relay/client.js';
import type { ToolHandler } from '../../ui/relay/state.js';

export interface FakeSocketControl {
  url: string;
  sent: Uint8Array[];
  fireOpen(): void;
  fireReceive(env: Envelope): void;
  fireServerClose(code?: number, reason?: string): void;
}

export type FakeBehavior = (sock: FakeSocketControl, port: number) => void;

export const buildFakeFactory = (
  behavior: FakeBehavior,
): { WS: WebSocketCtor; sockets: FakeSocketControl[] } => {
  const sockets: FakeSocketControl[] = [];

  class FakeWS implements FakeSocketControl {
    binaryType: BinaryType = 'blob';
    readyState = 0;
    onopen: ((ev: Event) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onclose: ((ev: CloseEvent) => void) | null = null;
    sent: Uint8Array[] = [];

    constructor(public url: string) {
      sockets.push(this);
      queueMicrotask(() => behavior(this, Number(new URL(url).port)));
    }

    fireOpen(): void {
      this.readyState = 1;
      this.onopen?.(new Event('open'));
    }

    fireReceive(env: Envelope): void {
      const bytes = encodeEnvelope(env);
      const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      this.onmessage?.({ data } as MessageEvent);
    }

    fireServerClose(code = 1000, reason = ''): void {
      this.close(code, reason);
    }

    send(data: ArrayBuffer | ArrayBufferView): void {
      this.sent.push(data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer));
    }

    close(code = 1000, reason = ''): void {
      this.readyState = 3;
      this.onclose?.({ code, reason, wasClean: true } as CloseEvent);
    }
  }

  return { WS: FakeWS as unknown as WebSocketCtor, sockets };
};

export const helloResult = (overrides: Partial<HelloResult> = {}): HelloResult => ({
  serverVersion: '1.0.0',
  protocolVersion: PROTOCOL_VERSION,
  sessionResumed: false,
  ...overrides,
});

export const helloRequestOf = (sock: FakeSocketControl): RequestEnvelope =>
  decodeEnvelope(sock.sent[0]!) as RequestEnvelope;

export const acceptHello = (
  sock: FakeSocketControl,
  overrides: Partial<HelloResult> = {},
): void => {
  sock.fireOpen();
  const req = helloRequestOf(sock);
  sock.fireReceive(
    createResponse({ id: req.id, sessionId: req.sessionId, result: helloResult(overrides) }),
  );
};

export const rejectHello = (sock: FakeSocketControl, code: string, message: string): void => {
  sock.fireOpen();
  const req = helloRequestOf(sock);
  sock.fireReceive(createError({ id: req.id, sessionId: req.sessionId, code, message }));
};

export const lastSent = (sock: FakeSocketControl): Envelope => decodeEnvelope(sock.sent.at(-1)!);

export const lastSentError = (sock: FakeSocketControl): { code: string; message: string } => {
  const reply = lastSent(sock);
  if (reply.kind !== 'err') throw new Error(`expected an err reply, got ${reply.kind}`);
  return reply.error;
};

export const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const connectWithLiveSocket = async (
  handler?: ToolHandler,
): Promise<{ client: RelayClient; live: FakeSocketControl }> => {
  const { WS, sockets } = buildFakeFactory(sock => acceptHello(sock));
  const client = new RelayClient({ ports: [3055], clientVersion: '0.0.0', WS });
  if (handler !== undefined) client.setToolHandler(handler);
  await client.connect();
  return { client, live: sockets[0]! };
};
