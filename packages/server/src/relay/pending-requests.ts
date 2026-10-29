import { newId } from '@figma-forge/core';

import { sendRequest } from './envelopes.js';
import type { Session } from './session.js';

export interface ServedBy {
  sessionId: string | undefined;
}

export interface RequestToOpen {
  readonly method: string;
  readonly params: unknown;
  readonly pinnedSessionId: string | undefined;
  readonly timeoutMs: number;
  readonly served: ServedBy;
}

interface PendingRequest extends RequestToOpen {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
  dispatchedToSessionId: string | undefined;
}

export interface OpenedRequest {
  readonly id: string;
  readonly settled: Promise<unknown>;
}

const isQueuedFor = (request: PendingRequest, sessionId: string): boolean =>
  request.dispatchedToSessionId === undefined &&
  (request.pinnedSessionId === undefined || request.pinnedSessionId === sessionId);

export class PendingRequests {
  private readonly requests = new Map<string, PendingRequest>();

  open(input: RequestToOpen): OpenedRequest {
    const id = newId();
    const settled = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => this.expire(id), input.timeoutMs);
      this.requests.set(id, { ...input, resolve, reject, timer, dispatchedToSessionId: undefined });
    });
    return { id, settled };
  }

  dispatch(id: string, session: Session): void {
    const request = this.requests.get(id);
    if (request === undefined || session.socket === null) return;
    request.dispatchedToSessionId = session.id;
    sendRequest(session.socket, {
      id,
      sessionId: session.id,
      method: request.method,
      params: request.params,
    });
  }

  flushTo(session: Session): number {
    const queued = [...this.requests].filter(([, request]) => isQueuedFor(request, session.id));
    for (const [id] of queued) this.dispatch(id, session);
    return queued.length;
  }

  answer(id: string, result: unknown): void {
    this.take(id, request => request.dispatchedToSessionId)?.resolve(result);
  }

  refuse(id: string, error: Error): void {
    this.take(id, request => request.dispatchedToSessionId)?.reject(error);
  }

  fail(id: string, error: Error): void {
    this.take(id, () => undefined)?.reject(error);
  }

  abandonSession(sessionId: string, errorFor: (method: string) => Error): void {
    for (const [id, request] of this.requests) {
      if (request.dispatchedToSessionId !== sessionId) continue;
      this.take(id, () => sessionId)?.reject(errorFor(request.method));
    }
  }

  hasInflight(sessionId: string): boolean {
    return [...this.requests.values()].some(r => r.dispatchedToSessionId === sessionId);
  }

  count(): number {
    return this.requests.size;
  }

  queuedCount(): number {
    return [...this.requests.values()].filter(r => r.dispatchedToSessionId === undefined).length;
  }

  rejectAll(errorFor: (method: string) => Error): void {
    for (const request of this.requests.values()) {
      clearTimeout(request.timer);
      request.reject(errorFor(request.method));
    }
    this.requests.clear();
  }

  private expire(id: string): void {
    const request = this.take(id, r => r.dispatchedToSessionId);
    request?.reject(new Error(`plugin request timeout (method=${request.method})`));
  }

  private take(
    id: string,
    servedBy: (request: PendingRequest) => string | undefined,
  ): PendingRequest | undefined {
    const request = this.requests.get(id);
    if (request === undefined) return undefined;
    clearTimeout(request.timer);
    this.requests.delete(id);
    request.served.sessionId = servedBy(request);
    return request;
  }
}
