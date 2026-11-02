import { newId, type RpcRequest, type RpcResponse } from '@figma-forge/core';

import type { PluginSessionInfo } from '../routing/sessions.js';
import { AbdicationOutcome, abdicationOutcomeOf } from './abdication-outcome.js';
import { type FetchFn, postRpc } from './follower-rpc.js';
import { type LeaderInfo, type LeaderPing, parseLeaderPing } from './leader-ping.js';
import {
  ABDICATE_PATH,
  HttpStatus,
  JSON_CONTENT_TYPE,
  PING_PATH,
  RPC_PATH,
} from './leader-wire.js';

export const DEFAULT_FOLLOWER_RPC_TIMEOUT_MS = 35_000;
export const DEFAULT_PING_TIMEOUT_MS = 2_000;

export interface FollowerOptions {
  leaderUrl: string;
  rpcTimeoutMs?: number;
  pingTimeoutMs?: number;
  fetch?: FetchFn;
  log?: (msg: string) => void;
  buildId?: number;
}

const releaseBody = (res: Response): void => {
  void res.body?.cancel().catch(() => undefined);
};

export class Follower {
  private readonly opts: Required<FollowerOptions>;

  constructor(opts: FollowerOptions) {
    this.opts = {
      leaderUrl: opts.leaderUrl,
      rpcTimeoutMs: opts.rpcTimeoutMs ?? DEFAULT_FOLLOWER_RPC_TIMEOUT_MS,
      pingTimeoutMs: opts.pingTimeoutMs ?? DEFAULT_PING_TIMEOUT_MS,
      fetch: opts.fetch ?? globalThis.fetch.bind(globalThis),
      log: opts.log ?? ((): void => {}),
      buildId: opts.buildId ?? 0,
    };
  }

  get leaderUrl(): string {
    return this.opts.leaderUrl;
  }

  async ping(): Promise<boolean> {
    return (await this.fetchPing()) !== undefined;
  }

  async leaderInfo(): Promise<LeaderInfo | undefined> {
    return (await this.fetchPing())?.info;
  }

  async resolveActiveSession(): Promise<string | undefined> {
    return (await this.fetchPing())?.activeSessionId;
  }

  async listSessions(): Promise<readonly PluginSessionInfo[]> {
    return (await this.fetchPing())?.sessions ?? [];
  }

  async requestAbdication(buildId: number): Promise<AbdicationOutcome> {
    try {
      const res = await this.opts.fetch(`${this.opts.leaderUrl}${ABDICATE_PATH}`, {
        method: 'POST',
        headers: { 'content-type': JSON_CONTENT_TYPE },
        body: JSON.stringify({ buildId }),
        signal: AbortSignal.timeout(this.opts.pingTimeoutMs),
      });
      if (res.ok) return abdicationOutcomeOf(await res.json());
      releaseBody(res);
      return res.status === HttpStatus.NotFound
        ? AbdicationOutcome.Unsupported
        : AbdicationOutcome.Error;
    } catch {
      return AbdicationOutcome.Error;
    }
  }

  async sendRpc(
    toolName: string,
    args?: unknown,
    requestId?: string,
    sessionId?: string,
    timeoutMs?: number,
    abort?: AbortSignal,
  ): Promise<RpcResponse> {
    const rpc: RpcRequest = {
      requestId: requestId ?? newId(),
      toolName,
      ...(args === undefined ? {} : { args }),
      ...(sessionId === undefined ? {} : { sessionId }),
      buildId: this.opts.buildId,
    };
    const budget = AbortSignal.timeout(timeoutMs ?? this.opts.rpcTimeoutMs);
    return postRpc(rpc, {
      fetch: this.opts.fetch,
      url: `${this.opts.leaderUrl}${RPC_PATH}`,
      signal: abort === undefined ? budget : AbortSignal.any([budget, abort]),
      log: this.opts.log,
    });
  }

  private async fetchPing(): Promise<LeaderPing | undefined> {
    try {
      const res = await this.opts.fetch(`${this.opts.leaderUrl}${PING_PATH}`, {
        signal: AbortSignal.timeout(this.opts.pingTimeoutMs),
      });
      if (res.ok) return parseLeaderPing(await res.json());
      releaseBody(res);
      return undefined;
    } catch {
      return undefined;
    }
  }
}
