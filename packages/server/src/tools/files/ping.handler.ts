import { dispatchTargeted } from '../../dispatch/dispatch.js';
import { pluginSetupHint } from '../../plugin-install/setup-hint.js';
import type { Session } from '../../relay/session.js';
import type { FileTarget } from '../../routing/target.js';
import { getFileTarget } from '../../routing/target.js';
import { createFollowerServerInfo, createServerInfo } from './ping-server-info.js';
import type {
  PingContext,
  PingResult,
  PingServerInfo,
  PingSessionInfo,
  PingSessionsInfo,
} from './ping.types.js';

const createSessionInfo = (session: Session): PingSessionInfo => ({
  id: session.id,
  fileName: session.fileName,
  pageName: session.pageName,
  lastActivityAt: session.lastActivityAt,
  pluginVersion: session.clientVersion,
});

const createSessionsInfo = (
  connected: readonly Session[],
  routed: Session | undefined,
  target: FileTarget | null,
): PingSessionsInfo => ({
  connectedCount: connected.length,
  routedSessionId: routed?.id ?? null,
  routedFileName: routed?.fileName ?? null,
  routedPageName: routed?.pageName ?? null,
  boundSessionId: target?.sessionId ?? null,
  boundFileName: target?.fileName ?? null,
  all: connected
    .toSorted((left, right) => right.lastActivityAt - left.lastActivityAt)
    .map(createSessionInfo),
});

const dispatchPing = async (
  context: PingContext,
  server: PingServerInfo,
  sessions?: PingSessionsInfo,
): Promise<PingResult> => {
  try {
    const plugin = await dispatchTargeted(
      {
        node: context.node,
        follower: context.follower,
        ...(context.log === undefined ? {} : { log: context.log }),
      },
      'ping',
      {},
    );
    return {
      ok: true,
      hop: 'e2e',
      server,
      ...(sessions === undefined ? {} : { sessions }),
      plugin,
    };
  } catch (error: unknown) {
    const dispatchError = error instanceof Error ? error.message : String(error);
    context.log?.(`[ping] dispatch failed, falling back to server-only: ${dispatchError}`);
    return {
      ok: true,
      hop: 'server-only',
      server,
      ...(sessions === undefined ? {} : { sessions }),
      plugin: null,
      dispatchError,
    };
  }
};

const probeLeader = async (context: PingContext, server: PingServerInfo): Promise<PingResult> => {
  const relay = context.node.getLeader()?.relay;
  if (relay === undefined) return dispatchPing(context, server);
  const connected = relay.sessions.connected();
  if (connected.length === 0) {
    const sessions = createSessionsInfo(connected, undefined, getFileTarget());
    return { ok: true, hop: 'server-only', server, sessions, plugin: null };
  }
  const sessions = createSessionsInfo(connected, relay.pickActiveSession(), getFileTarget());
  return dispatchPing(context, server, sessions);
};

const probe = async (context: PingContext): Promise<PingResult> => {
  const server = createServerInfo(context);
  if (context.node.isConflicted()) {
    return {
      ok: true,
      hop: 'server-only',
      server: { ...server, portConflict: context.node.conflictMessage },
      plugin: null,
    };
  }
  if (context.node.isLeader()) return probeLeader(context, server);
  return dispatchPing(context, await createFollowerServerInfo(context, server));
};

export const handlePing = async (context: PingContext): Promise<PingResult> => {
  const result = await probe(context);
  const isPluginMissing = result.plugin === null && result.server.portConflict === undefined;
  if (!isPluginMissing || context.pluginInstall === undefined) return result;
  return { ...result, pluginSetup: pluginSetupHint(await context.pluginInstall) };
};

export const formatPingResult = (result: PingResult): string => JSON.stringify(result, null, 2);
