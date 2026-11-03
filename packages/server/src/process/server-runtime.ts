import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { Election } from '../election/election.js';
import { Follower } from '../election/follower.js';
import { attachLeaderEndpoints } from '../election/leader-endpoints.js';
import { writeLeaderLock } from '../election/leader-lock.js';
import { NodeRole } from '../election/node-role.js';
import { Node } from '../election/node.js';
import {
  installPlugin,
  PLUGIN_DIR_ENV,
  resolvePluginInstallDir,
  type PluginInstallResult,
} from '../plugin-install/install-plugin.js';
import { describePluginInstall } from '../plugin-install/setup-hint.js';
import { BUILD_ID } from './build-id.js';
import { log, SERVER_PORT, SERVER_VERSION } from './server-config.js';

export interface ServerRuntime {
  node: Node;
  follower: Follower;
  election: Election;
  pluginInstall: Promise<PluginInstallResult>;
}

const wireLeadership = (node: Node, election: Election): void => {
  let detachEndpoints: (() => void) | null = null;
  node.onRoleChange(role => {
    detachEndpoints?.();
    detachEndpoints = null;
    if (role !== NodeRole.Leader) return;
    const resources = node.getLeader();
    if (resources === null) return;
    if (
      !writeLeaderLock({
        port: resources.port,
        buildId: BUILD_ID,
        serverVersion: SERVER_VERSION,
      })
    ) {
      log(`[election] could not write the leader lock for :${resources.port}`);
    }
    detachEndpoints = attachLeaderEndpoints(resources.http, {
      relay: resources.relay,
      serverVersion: SERVER_VERSION,
      buildId: BUILD_ID,
      onAbdicate: () => election.yieldLeadership(),
      log,
    });
  });
};

const beginPluginInstall = (): Promise<PluginInstallResult> => {
  const install = installPlugin({
    bundleDir: fileURLToPath(new URL('../plugin/', import.meta.url)),
    installDir: resolvePluginInstallDir(process.env[PLUGIN_DIR_ENV], homedir()),
    version: SERVER_VERSION,
  });
  void install.then(result => log(describePluginInstall(result)));
  return install;
};

export const createServerRuntime = async (): Promise<ServerRuntime> => {
  const node = new Node({ serverVersion: SERVER_VERSION, port: SERVER_PORT, log });
  const follower = new Follower({ leaderUrl: node.leaderUrl, log, buildId: BUILD_ID });
  const election = new Election({ node, follower, buildId: BUILD_ID, log });
  wireLeadership(node, election);
  await election.start();
  return { node, follower, election, pluginInstall: beginPluginInstall() };
};
