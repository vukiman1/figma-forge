import { log } from '../process/server-config.js';
import type { ServerRuntime } from '../process/server-runtime.js';
import {
  dispatchTargeted,
  dispatchTool,
  listPluginSessions,
  resolveRoutingSession,
  type DispatchContext,
} from './dispatch.js';

export type ToolDispatch = (toolName: string, args: unknown) => Promise<unknown>;

export interface ToolDispatchers {
  dispatch: ToolDispatch;
  dispatchToSession: (
    sessionId: string,
    toolName: string,
    args: unknown,
    perCallTimeoutMs: number,
  ) => Promise<unknown>;
  listSessions: () => ReturnType<typeof listPluginSessions>;
  routedDispatch: () => Promise<ToolDispatch>;
}

export const createToolDispatchers = (runtime: ServerRuntime): ToolDispatchers => {
  const context: DispatchContext = { node: runtime.node, follower: runtime.follower, log };
  const dispatch = (toolName: string, args: unknown): Promise<unknown> =>
    dispatchTargeted(context, toolName, args);
  return {
    dispatch,
    listSessions: () => listPluginSessions(context),
    dispatchToSession: (sessionId, toolName, args, perCallTimeoutMs) =>
      dispatchTool(context, toolName, args, { sessionId, perCallTimeoutMs }),
    routedDispatch: async () => {
      const sessionId = await resolveRoutingSession(context);
      const options = sessionId === undefined ? {} : { sessionId };
      return (toolName, args) => dispatchTool(context, toolName, args, options);
    },
  };
};
