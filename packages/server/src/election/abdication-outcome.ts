import { z } from 'zod';

import { AbdicateReason } from './leader-wire.js';

export enum AbdicationOutcome {
  Ok = 'ok',
  Busy = 'busy',
  Refused = 'refused',
  Unsupported = 'unsupported',
  Error = 'error',
}

const OUTCOME_BY_REASON = new Map<unknown, AbdicationOutcome>([
  [AbdicateReason.Busy, AbdicationOutcome.Busy],
  [AbdicateReason.Stale, AbdicationOutcome.Refused],
  [AbdicateReason.Unsupported, AbdicationOutcome.Unsupported],
]);

const AbdicateReplySchema = z.object({
  ok: z.unknown().optional(),
  reason: z.unknown().optional(),
});

export const abdicationOutcomeOf = (body: unknown): AbdicationOutcome => {
  const reply = AbdicateReplySchema.safeParse(body);
  if (!reply.success) return AbdicationOutcome.Error;
  if (reply.data.ok === true) return AbdicationOutcome.Ok;
  return OUTCOME_BY_REASON.get(reply.data.reason) ?? AbdicationOutcome.Error;
};
