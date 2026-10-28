import { ErrorCode, type RequestEnvelope } from '@figma-forge/core';

import { PluginToolFailure } from '../../protocol/bridge.js';
import { encodeToolError, encodeToolResult } from './envelopes.js';
import { errorMessage } from './error-message.js';
import { extractNodeIds } from './node-ids.js';
import { summarizePayload } from './payload.js';
import type { RelayStore } from './relay-store.js';
import {
  type ActivityStatus,
  type CallEnd,
  recordCallEnd,
  recordCallStart,
  type ToolHandler,
} from './state.js';

export interface ToolDispatchContext {
  readonly store: RelayStore;
  readonly getHandler: () => ToolHandler | null;
  readonly log: (msg: string) => void;
  readonly notifyAlive: () => void;
}

type CallOutcome = Omit<CallEnd, 'id' | 'status' | 'settledAt'>;

const recordStart = (store: RelayStore, request: RequestEnvelope): void => {
  store.update(
    recordCallStart(store.state, {
      id: request.id,
      method: request.method,
      startedAt: Date.now(),
      request: summarizePayload(request.params),
      nodeIds: extractNodeIds(request.params),
    }),
  );
};

const settle = (
  store: RelayStore,
  id: string,
  status: ActivityStatus,
  outcome: CallOutcome,
): void => {
  store.update(recordCallEnd(store.state, { id, status, settledAt: Date.now(), ...outcome }));
};

const replyMissingHandler = (
  context: ToolDispatchContext,
  ws: WebSocket,
  request: RequestEnvelope,
): void => {
  const message = `no tool handler registered (method=${request.method})`;
  context.log(`[relay-client] ${message}`);
  settle(context.store, request.id, 'error', { error: message });
  ws.send(encodeToolError(request, ErrorCode.MethodNotFound, message));
};

const replyFailure = (
  context: ToolDispatchContext,
  ws: WebSocket,
  request: RequestEnvelope,
  error: unknown,
): void => {
  const message = errorMessage(error);
  const code = error instanceof PluginToolFailure ? error.code : ErrorCode.Internal;
  context.log(`[relay-client] tool handler threw for ${request.method}: ${message}`);
  settle(context.store, request.id, 'error', { error: message });
  ws.send(encodeToolError(request, code, message));
  context.notifyAlive();
};

export const dispatchToolRequest = async (
  context: ToolDispatchContext,
  ws: WebSocket,
  request: RequestEnvelope,
): Promise<void> => {
  recordStart(context.store, request);
  const handler = context.getHandler();
  if (handler === null) {
    replyMissingHandler(context, ws, request);
    return;
  }
  try {
    const result = await handler(request.method, request.params);
    settle(context.store, request.id, 'ok', {
      payload: summarizePayload(result),
      nodeIds: extractNodeIds(result),
    });
    ws.send(encodeToolResult(request, result));
    context.notifyAlive();
  } catch (error) {
    replyFailure(context, ws, request, error);
  }
};
