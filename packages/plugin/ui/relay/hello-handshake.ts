import type { Envelope, HelloResult } from '@figma-forge/core';

import type { ResolvedRelayOptions } from './client-options.js';
import { decodeMessage, encodeHello } from './envelopes.js';
import { errorMessage } from './error-message.js';

export interface HelloRejection {
  readonly code: string;
  readonly message: string;
}

export interface HandshakeRequest {
  readonly options: Pick<
    ResolvedRelayOptions,
    'WS' | 'host' | 'clientVersion' | 'connectTimeoutMs' | 'helloTimeoutMs'
  >;
  readonly port: number;
  readonly sessionId: string;
  readonly onRejected: (rejection: HelloRejection) => void;
  readonly onAccepted: (ws: WebSocket, result: HelloResult) => void;
}

class HelloHandshake {
  private readonly ws: WebSocket;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly request: HandshakeRequest,
    private readonly resolve: () => void,
    private readonly reject: (error: Error) => void,
  ) {
    this.ws = new request.options.WS(`ws://${request.options.host}:${request.port}`);
  }

  start(): void {
    const { port, options } = this.request;
    this.ws.binaryType = 'arraybuffer';
    this.timer = setTimeout(
      () => this.fail(`connect timeout on port ${port}`),
      options.connectTimeoutMs,
    );
    this.ws.onopen = () => this.sendHello();
    this.ws.onerror = () => this.fail(`socket error on port ${port}`);
    this.ws.onmessage = event => this.receive(event);
    this.ws.onclose = () => this.fail(`socket closed before hello on port ${port}`);
  }

  private sendHello(): void {
    const { port, options, sessionId } = this.request;
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => this.fail(`hello timeout on port ${port}`),
      options.helloTimeoutMs,
    );
    this.ws.send(encodeHello(sessionId, options.clientVersion));
  }

  private receive(event: MessageEvent): void {
    const envelope = this.decode(event);
    if (envelope === null) return;
    if (envelope.kind === 'err') {
      this.request.onRejected(envelope.error);
      this.fail(`hello rejected: ${envelope.error.message}`);
      return;
    }
    if (envelope.kind !== 'res') {
      this.fail(`unexpected first response kind: ${envelope.kind}`);
      return;
    }
    this.cleanup();
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the hello result comes off the wire from the server
    this.request.onAccepted(this.ws, envelope.result as HelloResult);
    this.resolve();
  }

  private decode(event: MessageEvent): Envelope | null {
    try {
      return decodeMessage(event);
    } catch (error) {
      this.fail(`decode failure: ${errorMessage(error)}`);
      return null;
    }
  }

  private fail(message: string): void {
    this.cleanup();
    closeQuietly(this.ws);
    this.reject(new Error(message));
  }

  private cleanup(): void {
    this.ws.onopen = null;
    this.ws.onerror = null;
    this.ws.onmessage = null;
    this.ws.onclose = null;
    clearTimeout(this.timer);
  }
}

const closeQuietly = (ws: WebSocket): void => {
  try {
    ws.close();
  } catch {
    return;
  }
};

export const performHandshake = (request: HandshakeRequest): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    new HelloHandshake(request, resolve, reject).start();
  });
