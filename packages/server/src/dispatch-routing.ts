import { dispatchTool } from './dispatch-tool.js';
import type { DispatchContext, DispatchOptions } from './dispatch-types.js';
import { errorMessage } from './error-message.js';
import type { PluginSessionInfo } from './routing/sessions.js';
import { getFileTarget, resolveFileTarget } from './routing/target.js';
import { namedSessions, type SessionDispatch } from './tools/files/list-files.handler.js';
import { reportRouting } from './tools/result/notices.js';

const ROUTING_NOTICE_TTL_MS = 10_000;

let sessionCountCache: { sessions: readonly PluginSessionInfo[]; at: number } | null = null;

export const resetRoutingNoticeCache = (): void => {
  sessionCountCache = null;
};

export const listPluginSessions = async (
  context: DispatchContext,
): Promise<readonly PluginSessionInfo[]> => {
  if (context.node.isConflicted()) return [];
  if (context.node.isLeader()) return context.node.getLeader()?.relay.listSessionInfo() ?? [];
  return context.follower.listSessions();
};

const noteAmbiguousRouting = async (context: DispatchContext): Promise<void> => {
  const now = Date.now();
  if (sessionCountCache === null || now - sessionCountCache.at > ROUTING_NOTICE_TTL_MS) {
    sessionCountCache = { sessions: await listPluginSessions(context), at: now };
  }
  const { sessions } = sessionCountCache;
  if (sessions.length < 2) return;
  const names = sessions.map(session => session.fileName ?? `(unnamed, session ${session.id})`);
  reportRouting(
    `${sessions.length} Figma files have Figma Forge open: ${names.join(', ')}. This call went to ` +
      `whichever one was last touched in Figma, and that changes when the user switches tabs — so ` +
      `a later call in this same task can land in a different file, silently. If you are working ` +
      `in one specific file, claim it now with use_file({ fileName: "…" }) (list_files shows the ` +
      `exact names and their sessionIds); every later call then goes there whatever is in front.`,
  );
};

const tryNoteAmbiguousRouting = async (context: DispatchContext): Promise<void> => {
  try {
    await noteAmbiguousRouting(context);
  } catch (error: unknown) {
    context.log?.(`[dispatch] failed to inspect ambiguous routing: ${errorMessage(error)}`);
  }
};

const sessionDispatch =
  (context: DispatchContext): SessionDispatch =>
  (sessionId, toolName, args, perCallTimeoutMs) =>
    dispatchTool(context, toolName, args, { sessionId, perCallTimeoutMs });

const resolveTargetFor = async (context: DispatchContext): Promise<string | undefined> =>
  resolveFileTarget(
    () => listPluginSessions(context),
    async () => namedSessions(await listPluginSessions(context), sessionDispatch(context)),
  );

export const resolveRoutingSession = async (
  context: DispatchContext,
): Promise<string | undefined> => {
  if (context.node.isConflicted()) return undefined;
  if (getFileTarget() !== null) return resolveTargetFor(context);
  await tryNoteAmbiguousRouting(context);
  if (context.node.isLeader()) return context.node.getLeader()?.relay.pickActiveSessionId();
  return context.follower.resolveActiveSession();
};

const isPinnedSessionGone = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('pinned session not connected');

export const dispatchTargeted = async (
  context: DispatchContext,
  toolName: string,
  args: unknown,
  options: DispatchOptions = {},
): Promise<unknown> => {
  const target = getFileTarget();
  if (target === null) {
    await tryNoteAmbiguousRouting(context);
    return dispatchTool(context, toolName, args, options);
  }
  try {
    return await dispatchTool(context, toolName, args, {
      ...options,
      sessionId: target.sessionId,
    });
  } catch (error: unknown) {
    if (!isPinnedSessionGone(error)) throw error;
    const recovered = await resolveTargetFor(context);
    if (recovered === undefined) throw error;
    return dispatchTool(context, toolName, args, { ...options, sessionId: recovered });
  }
};
