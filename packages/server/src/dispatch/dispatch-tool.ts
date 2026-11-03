import { ErrorCode, getFollowerBudget, getRelayBudget } from '@figma-forge/core';

import { NodeRole } from '../election/node-role.js';
import { reportSkew } from '../tools/result/notices.js';
import type { DispatchContext, DispatchOptions } from './dispatch-types.js';

const DEFAULT_DISPATCH_MAX_ATTEMPTS = 3;
const DEFAULT_DISPATCH_RETRY_DELAY_MS = 1_500;

interface DispatchRequest {
  toolName: string;
  args: unknown;
  maxAttempts: number;
  retryDelayMs: number;
  perCallTimeoutMs?: number;
  sessionId?: string;
}

export class DispatchError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DispatchError';
  }
}

const delay = async (durationMs: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, durationMs));

const dispatchLeader = async (
  context: DispatchContext,
  request: DispatchRequest,
): Promise<unknown> => {
  const leader = context.node.getLeader();
  if (leader === null) {
    throw new DispatchError(ErrorCode.Internal, 'leader resources missing despite Leader role');
  }
  return leader.relay.sendRequest(
    request.toolName,
    request.args,
    request.perCallTimeoutMs ?? getRelayBudget(request.toolName),
    request.sessionId,
    served => reportSkew(leader.relay.skewNotice(served)),
  );
};

const isTransientResponse = (code: string, message: string): boolean =>
  code === ErrorCode.Internal &&
  /transport|fetch failed|ECONNREFUSED|relay stopping/i.test(message);

const dispatchAttempt = async (
  context: DispatchContext,
  request: DispatchRequest,
  attempt: number,
  signal: AbortSignal,
  nextAttempt: () => AbortSignal,
): Promise<unknown> => {
  if (context.node.isConflicted()) {
    throw new DispatchError(ErrorCode.NotLeader, context.node.conflictMessage);
  }
  if (context.node.isLeader()) return dispatchLeader(context, request);
  const response = await context.follower.sendRpc(
    request.toolName,
    request.args,
    undefined,
    request.sessionId,
    request.perCallTimeoutMs ?? getFollowerBudget(request.toolName),
    signal,
  );
  if (response.kind === 'ok') {
    reportSkew(response.notice ?? null);
    return response.result;
  }
  const isLastAttempt = attempt >= request.maxAttempts - 1;
  if (!isTransientResponse(response.code, response.message) || isLastAttempt) {
    throw new DispatchError(response.code, response.message);
  }
  context.log?.(
    `[dispatch] transient leader error, retrying in ${request.retryDelayMs}ms ` +
      `(attempt ${attempt + 1}/${request.maxAttempts})`,
  );
  await delay(request.retryDelayMs);
  return dispatchAttempt(context, request, attempt + 1, nextAttempt(), nextAttempt);
};

const createRequest = (
  toolName: string,
  args: unknown,
  options: DispatchOptions,
): DispatchRequest => ({
  toolName,
  args,
  maxAttempts: options.maxAttempts ?? DEFAULT_DISPATCH_MAX_ATTEMPTS,
  retryDelayMs: options.retryDelayMs ?? DEFAULT_DISPATCH_RETRY_DELAY_MS,
  ...(options.perCallTimeoutMs === undefined ? {} : { perCallTimeoutMs: options.perCallTimeoutMs }),
  ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
});

export const dispatchTool = async (
  context: DispatchContext,
  toolName: string,
  args: unknown,
  options: DispatchOptions = {},
): Promise<unknown> => {
  const request = createRequest(toolName, args, options);
  if (request.maxAttempts <= 0) {
    throw new DispatchError(ErrorCode.Internal, 'dispatch exhausted retries');
  }
  let conflictController = new AbortController();
  const nextAttempt = (): AbortSignal => {
    conflictController = new AbortController();
    return conflictController.signal;
  };
  const stopWatching = context.node.onRoleChange(role => {
    if (role === NodeRole.Conflicted) conflictController.abort(new Error('port conflict'));
  });
  try {
    return await dispatchAttempt(context, request, 0, nextAttempt(), nextAttempt);
  } finally {
    stopWatching();
  }
};
