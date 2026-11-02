import { createServer, type Server as HttpServer } from 'node:http';

import { DEFAULT_PORT } from '@figma-forge/core';

import { errorMessage } from '../error-message.js';
import { Relay } from '../relay/relay.js';
import { bindPort, closeAllConnections } from './bind-port.js';
import { NodeRole } from './node-role.js';
import { portConflictMessage } from './port-conflict-message.js';
import type { PortHolder } from './port-holder.js';

const DEFAULT_HOST = '127.0.0.1';

export interface NodeOptions {
  serverVersion: string;
  port?: number;
  host?: string;
  log?: (msg: string) => void;
}

export interface LeaderResources {
  http: HttpServer;
  relay: Relay;
  port: number;
}

type RoleListener = (role: NodeRole) => void;

export class Node {
  private currentRole = NodeRole.Unknown;
  private leader: LeaderResources | null = null;
  private conflict: string | null = null;
  private readonly opts: Required<NodeOptions>;
  private readonly listeners = new Set<RoleListener>();

  constructor(opts: NodeOptions) {
    this.opts = {
      serverVersion: opts.serverVersion,
      port: opts.port ?? DEFAULT_PORT,
      host: opts.host ?? DEFAULT_HOST,
      log: opts.log ?? ((): void => {}),
    };
  }

  get role(): NodeRole {
    return this.currentRole;
  }

  isLeader(): boolean {
    return this.currentRole === NodeRole.Leader;
  }

  isFollower(): boolean {
    return this.currentRole === NodeRole.Follower;
  }

  isConflicted(): boolean {
    return this.currentRole === NodeRole.Conflicted;
  }

  get port(): number {
    return this.opts.port;
  }

  get leaderUrl(): string {
    return `http://${this.opts.host}:${this.opts.port}`;
  }

  get conflictMessage(): string {
    return this.conflict ?? portConflictMessage(this.opts.port);
  }

  async becomeLeader(): Promise<LeaderResources> {
    if (this.currentRole === NodeRole.Leader && this.leader !== null) return this.leader;
    const http = createServer();
    let port: number;
    try {
      port = await bindPort(http, this.opts.port, this.opts.host);
    } catch (error) {
      http.close();
      throw error;
    }
    const relay = new Relay({
      serverVersion: this.opts.serverVersion,
      server: http,
      log: this.opts.log,
    });
    this.leader = { http, relay, port };
    this.setRole(NodeRole.Leader);
    this.opts.log(`[node] became LEADER on :${port}`);
    return this.leader;
  }

  becomeFollower(): void {
    if (this.currentRole === NodeRole.Follower) return;
    this.releaseLeader();
    this.setRole(NodeRole.Follower);
    this.opts.log(`[node] became FOLLOWER (leader @ ${this.leaderUrl})`);
  }

  becomeConflicted(holder?: PortHolder): void {
    this.conflict = portConflictMessage(this.opts.port, holder);
    if (this.currentRole === NodeRole.Conflicted) return;
    this.releaseLeader();
    this.setRole(NodeRole.Conflicted);
    this.opts.log(`[node] PORT CONFLICT — ${this.conflict}`);
  }

  getLeader(): LeaderResources | null {
    return this.leader;
  }

  onRoleChange(listener: RoleListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async stop(): Promise<void> {
    const leader = this.leader;
    this.leader = null;
    if (leader !== null) {
      await leader.relay.stop();
      await closeAllConnections(leader.http);
    }
    this.currentRole = NodeRole.Unknown;
    this.listeners.clear();
  }

  private releaseLeader(): void {
    if (this.leader === null) return;
    const { http, relay } = this.leader;
    this.leader = null;
    void relay.stop().catch((error: unknown) => {
      this.opts.log(`[node] relay stop after demotion failed: ${errorMessage(error)}`);
    });
    void closeAllConnections(http);
  }

  private setRole(role: NodeRole): void {
    if (this.currentRole === role) return;
    if (role !== NodeRole.Conflicted) this.conflict = null;
    this.currentRole = role;
    for (const listener of this.listeners) listener(role);
  }
}
