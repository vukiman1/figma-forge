import { ErrorCode } from '@figma-forge/core';

import {
  createToolError,
  createToolResult,
  isPluginBridgeMessage,
  type PluginToolError,
  type PluginToolResult,
} from '../../protocol/bridge.js';
import { withEditorContext } from '../../protocol/editor-context.js';
import { errorMessage } from '../features/error-message.js';
import type { SandboxHandlers } from './sandbox-handler.js';

export interface DispatchInput {
  readonly raw: unknown;
  readonly handlers: SandboxHandlers;
  readonly editorType: string;
  readonly log?: (msg: string) => void;
}

export type DispatchOutcome =
  | { readonly kind: 'reply'; readonly reply: PluginToolResult | PluginToolError }
  | { readonly kind: 'ignore' };

const IGNORED: DispatchOutcome = { kind: 'ignore' };

const silent = (): void => undefined;

export const dispatchSandboxMessage = async (input: DispatchInput): Promise<DispatchOutcome> => {
  if (!isPluginBridgeMessage(input.raw) || input.raw.kind !== 'tool-call') return IGNORED;
  const { id, method, params } = input.raw;
  const handler = input.handlers[method];
  const log = input.log ?? silent;
  if (handler === undefined) {
    log(`[sandbox] no handler for ${method}`);
    const message = `no sandbox handler (method=${method})`;
    return {
      kind: 'reply',
      reply: createToolError({ id, code: ErrorCode.MethodNotFound, message }),
    };
  }
  try {
    const result = await handler(params);
    return { kind: 'reply', reply: createToolResult({ id, result }) };
  } catch (error) {
    const raised = errorMessage(error);
    log(`[sandbox] handler ${method} threw: ${raised}`);
    const message = withEditorContext(raised, input.editorType);
    return { kind: 'reply', reply: createToolError({ id, code: ErrorCode.Internal, message }) };
  }
};
