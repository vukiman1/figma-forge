import { AbdicationOutcome } from './abdication-outcome.js';
import type { Follower } from './follower.js';
import type { Node } from './node.js';
import { grabReleasedPort } from './port-handoff.js';

export enum ChallengeResult {
  Settled = 'settled',
  RetryLater = 'retry-later',
  BackOff = 'back-off',
}

export interface StaleLeaderChallenge {
  readonly node: Node;
  readonly follower: Follower;
  readonly buildId: number;
  readonly log: (msg: string) => void;
}

const BACKOFF_LOG = new Map<AbdicationOutcome, string>([
  [
    AbdicationOutcome.Unsupported,
    '[election] stale leader predates abdication — it must be retired manually (see ping)',
  ],
  [
    AbdicationOutcome.Refused,
    '[election] abdication refused — leader no longer older; backing off',
  ],
]);

export const challengeStaleLeader = async ({
  node,
  follower,
  buildId,
  log,
}: StaleLeaderChallenge): Promise<ChallengeResult> => {
  const outcome = await follower.requestAbdication(buildId);
  if (outcome === AbdicationOutcome.Ok) {
    log('[election] stale leader is abdicating — grabbing the port');
    await grabReleasedPort(node, log);
    return ChallengeResult.Settled;
  }
  const backoffLog = BACKOFF_LOG.get(outcome);
  if (backoffLog === undefined) return ChallengeResult.RetryLater;
  log(backoffLog);
  return ChallengeResult.BackOff;
};
