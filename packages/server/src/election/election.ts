import { errorMessage } from '../error-message.js';
import { isAddressInUse } from './bind-port.js';
import { delay } from './delay.js';
import {
  ABDICATION_BACKOFF_MS,
  DEFAULT_TICK_INTERVAL_MS,
  type ElectionOptions,
  RACE_RETRY_DELAY_MS,
  WEDGED_UNRESPONSIVE_TICKS,
  YIELD_GRACE_MS,
} from './election-options.js';
import type { Follower } from './follower.js';
import type { LeaderInfo } from './leader-ping.js';
import { NodeRole } from './node-role.js';
import type { Node } from './node.js';
import { diagnosePortHolder } from './port-holder.js';
import { osProcessProbe, type ProcessProbe } from './process-probe.js';
import { ChallengeResult, challengeStaleLeader } from './stale-leader-challenge.js';

export class Election {
  private readonly node: Node;
  private readonly follower: Follower;
  private readonly buildId: number;
  private readonly tickIntervalMs: number;
  private readonly log: (msg: string) => void;
  private readonly probe: ProcessProbe;
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private isTickInFlight = false;
  private yieldUntil = 0;
  private abdicationBackoffUntil = 0;
  private unresponsiveTicks = 0;

  constructor(opts: ElectionOptions) {
    this.node = opts.node;
    this.follower = opts.follower;
    this.buildId = opts.buildId ?? 0;
    this.tickIntervalMs = opts.tickIntervalMs ?? DEFAULT_TICK_INTERVAL_MS;
    this.log = opts.log ?? ((): void => {});
    this.probe = opts.probe ?? osProcessProbe;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    await this.determineRole();
    this.timer = setInterval(() => {
      if (this.isRunning) void this.tickOnce();
    }, this.tickIntervalMs);
  }

  stop(): void {
    this.isRunning = false;
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  async determineRole(): Promise<void> {
    if (await this.tryLeadOrFollow()) return;
    this.log('[election] port taken but not a Figma Forge leader — race retry');
    await delay(RACE_RETRY_DELAY_MS);
    if (await this.tryLeadOrFollow()) return;
    this.enterConflicted();
  }

  yieldLeadership(): void {
    if (!this.node.isLeader()) return;
    this.yieldUntil = Date.now() + YIELD_GRACE_MS;
    this.node.becomeFollower();
    this.log('[election] abdicated — a newer build is taking over');
  }

  private async tryLeadOrFollow(): Promise<boolean> {
    try {
      await this.node.becomeLeader();
      return true;
    } catch (error) {
      if (!isAddressInUse(error)) {
        this.log(`[election] becomeLeader failed (not EADDRINUSE): ${errorMessage(error)}`);
        throw error;
      }
    }
    if (!(await this.follower.ping())) return false;
    this.node.becomeFollower();
    return true;
  }

  async tickOnce(): Promise<void> {
    if (this.isTickInFlight) return;
    this.isTickInFlight = true;
    try {
      await this.tickBody();
    } catch (error) {
      this.log(`[election] tick failed: ${errorMessage(error)}`);
    } finally {
      this.isTickInFlight = false;
    }
  }

  private async tickBody(): Promise<void> {
    if (this.node.role === NodeRole.Conflicted) {
      await this.tryLeadOrFollow();
      return;
    }
    if (this.node.role !== NodeRole.Follower) return;
    const leader = await this.follower.leaderInfo();
    if (leader !== undefined) {
      await this.onLeaderAnswered(leader);
      return;
    }
    if (Date.now() < this.yieldUntil) return;
    await this.takeOverSilentLeader();
  }

  private async onLeaderAnswered(leader: LeaderInfo): Promise<void> {
    this.unresponsiveTicks = 0;
    const isLeaderStale = this.buildId > (leader.buildId ?? 0);
    if (isLeaderStale && Date.now() >= this.abdicationBackoffUntil)
      await this.challengeStaleLeader();
  }

  private async takeOverSilentLeader(): Promise<void> {
    this.log('[election] leader unresponsive — attempting takeover');
    try {
      await this.node.becomeLeader();
      this.unresponsiveTicks = 0;
    } catch (error) {
      this.onTakeoverFailed(error);
    }
  }

  private onTakeoverFailed(error: unknown): void {
    if (!isAddressInUse(error)) {
      this.log(`[election] takeover failed: ${errorMessage(error)}`);
      return;
    }
    this.unresponsiveTicks += 1;
    this.log(
      `[election] takeover lost — port still held by an unresponsive owner ` +
        `(${this.unresponsiveTicks}/${WEDGED_UNRESPONSIVE_TICKS})`,
    );
    if (this.unresponsiveTicks >= WEDGED_UNRESPONSIVE_TICKS) this.enterConflicted();
  }

  private enterConflicted(): void {
    this.unresponsiveTicks = 0;
    this.node.becomeConflicted(diagnosePortHolder(this.node.port, this.probe, this.log));
  }

  private async challengeStaleLeader(): Promise<void> {
    const { node, follower, buildId, log } = this;
    const result = await challengeStaleLeader({ node, follower, buildId, log });
    if (result === ChallengeResult.BackOff) {
      this.abdicationBackoffUntil = Date.now() + ABDICATION_BACKOFF_MS;
    }
  }
}
