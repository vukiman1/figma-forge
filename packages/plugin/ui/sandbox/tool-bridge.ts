import { ErrorCode, getToolBudget, newId } from '@figma-forge/core';

import {
  createToolCall,
  isPluginBridgeMessage,
  type PluginBridgeMessage,
  PluginToolFailure,
} from '../../protocol/bridge.js';
import type { ToolHandler } from '../relay/state.js';
import { onSandboxMessage, postToSandbox } from './messaging.js';

const LIBRARY_IMPORT_TOOLS: ReadonlySet<string> = new Set(['import_variable', 'import_style']);

const LIBRARY_IMPORT_TIMEOUT_HINT =
  'Figma may defer library resolution in a background file. ' +
  'Bring the target Figma file to the foreground and retry. ' +
  'The import may still complete after this timeout.';

export type PostMessageFn = (msg: PluginBridgeMessage) => void;
export type SubscribeFn = (cb: (raw: unknown) => void) => () => void;

export interface ToolBridgeOptions {
  timeoutMs?: number;
  log?: (msg: string) => void;
  postMessage?: PostMessageFn;
  subscribe?: SubscribeFn;
}

export interface ToolBridge {
  handler: ToolHandler;
  pendingCount: () => number;
  dispose: () => void;
}

interface Pending {
  readonly resolve: (value: unknown) => void;
  readonly reject: (err: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

const timeoutError = (method: string): Error => {
  const message = `sandbox tool timeout (method=${method})`;
  if (!LIBRARY_IMPORT_TOOLS.has(method)) return new Error(message);
  return new PluginToolFailure(ErrorCode.Timeout, `${message}. ${LIBRARY_IMPORT_TIMEOUT_HINT}`);
};

const settleReply = (
  pending: Map<string, Pending>,
  raw: unknown,
  log: (msg: string) => void,
): void => {
  if (!isPluginBridgeMessage(raw) || raw.kind === 'tool-call') return;
  const entry = pending.get(raw.id);
  if (entry === undefined) {
    log(`[tool-bridge] orphan ${raw.kind} for id=${raw.id}`);
    return;
  }
  clearTimeout(entry.timer);
  pending.delete(raw.id);
  if (raw.kind === 'tool-result') entry.resolve(raw.result);
  else entry.reject(new PluginToolFailure(raw.code, raw.message));
};

export const createToolBridge = (opts: ToolBridgeOptions = {}): ToolBridge => {
  const log = opts.log ?? ((): void => {});
  const post = opts.postMessage ?? postToSandbox;
  const subscribe = opts.subscribe ?? onSandboxMessage;
  const pending = new Map<string, Pending>();
  const unsubscribe = subscribe(raw => settleReply(pending, raw, log));

  const handler: ToolHandler = (method, params) =>
    new Promise<unknown>((resolve, reject) => {
      const id = newId();
      const timer = setTimeout(
        () => {
          pending.delete(id);
          reject(timeoutError(method));
        },
        opts.timeoutMs ?? getToolBudget(method),
      );
      pending.set(id, { resolve, reject, timer });
      post(createToolCall({ id, method, params }));
    });

  const dispose = (): void => {
    unsubscribe();
    for (const [, entry] of pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error('tool bridge disposed'));
    }
    pending.clear();
  };

  return { handler, pendingCount: () => pending.size, dispose };
};
