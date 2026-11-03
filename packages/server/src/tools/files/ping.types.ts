import type { Follower } from '../../election/follower.js';
import type { NodeRole } from '../../election/node-role.js';
import type { Node } from '../../election/node.js';
import type { PluginInstallResult } from '../../plugin-install/install-plugin.js';

export type PingHop = 'server-only' | 'e2e';

export interface PingServerInfo {
  version: string;
  role: NodeRole;
  port: number | null;
  ts: number;
  buildId: number;
  leaderVersion?: string;
  leaderBuildId?: number;
  buildSkew?: string;
  versionSkew?: string;
  portConflict?: string;
}

export interface PingSessionInfo {
  id: string;
  fileName: string | null;
  pageName: string | null;
  lastActivityAt: number;
  pluginVersion: string;
}

export interface PingSessionsInfo {
  connectedCount: number;
  routedSessionId: string | null;
  routedFileName: string | null;
  routedPageName: string | null;
  boundSessionId: string | null;
  boundFileName: string | null;
  all: readonly PingSessionInfo[];
}

export interface PingResult {
  ok: true;
  hop: PingHop;
  server: PingServerInfo;
  sessions?: PingSessionsInfo;
  plugin: unknown;
  dispatchError?: string;
  pluginSetup?: string;
}

export interface PingContext {
  node: Node;
  follower: Follower;
  serverVersion: string;
  buildId?: number;
  log?: (message: string) => void;
  pluginInstall?: Promise<PluginInstallResult>;
}
