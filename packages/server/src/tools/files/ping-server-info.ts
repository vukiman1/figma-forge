import type { PingContext, PingServerInfo } from './ping.types.js';

export const createServerInfo = (context: PingContext): PingServerInfo => ({
  version: context.serverVersion,
  role: context.node.role,
  port: context.node.isLeader() ? (context.node.getLeader()?.port ?? null) : null,
  ts: Date.now(),
  buildId: context.buildId ?? 0,
});

const buildSkewMessage = (context: PingContext, leaderBuildId: number): string =>
  `leader runs an older build than this client (leader ${leaderBuildId} < ours ` +
  `${context.buildId ?? 0}). The election challenges stale leaders automatically, so this normally ` +
  `clears within seconds; if it persists, the leader predates abdication support — kill it ` +
  `(lsof -iTCP:${context.node.port} -sTCP:LISTEN) so election promotes this build.`;

const versionSkewMessage = (context: PingContext, leaderVersion: string): string =>
  `leader is v${leaderVersion} but this client's server is v${context.serverVersion} — a ` +
  `stale server process still owns the plugin, so your newer build isn't in effect. ` +
  `Kill the leader (lsof -iTCP:${context.node.port} -sTCP:LISTEN) so election promotes this version.`;

export const createFollowerServerInfo = async (
  context: PingContext,
  server: PingServerInfo,
): Promise<PingServerInfo> => {
  const leader = await context.follower.leaderInfo();
  if (leader === undefined) return server;
  const leaderBuildId = leader.buildId ?? 0;
  const hasBuildSkew = server.buildId > leaderBuildId;
  const hasVersionSkew = leader.serverVersion !== server.version;
  return {
    ...server,
    leaderVersion: leader.serverVersion,
    leaderBuildId,
    ...(hasBuildSkew ? { buildSkew: buildSkewMessage(context, leaderBuildId) } : {}),
    ...(hasVersionSkew ? { versionSkew: versionSkewMessage(context, leader.serverVersion) } : {}),
  };
};
