import type { IncomingMessage, ServerResponse } from 'node:http';

import { z } from 'zod';

import { hasContentType } from '../local-access.js';
import type { Relay } from '../relay/relay.js';
import { readJsonBody, writeJson } from './http-replies.js';
import { AbdicateReason, HttpStatus, JSON_CONTENT_TYPE } from './leader-wire.js';

export const ABDICATE_QUIET_WINDOW_MS = 10_000;

export interface AbdicateDeps {
  readonly relay: Relay;
  readonly buildId: number;
  readonly onAbdicate: (() => void) | undefined;
  readonly quietWindowMs: number;
  readonly log: (msg: string) => void;
}

const AbdicateRequestSchema = z.object({ buildId: z.number() });

const hasRecentTraffic = (relay: Relay, quietWindowMs: number): boolean => {
  const lastRequestAt = relay.lastRequestAt();
  return lastRequestAt !== 0 && Date.now() - lastRequestAt < quietWindowMs;
};

const refusalOf = (requesterBuildId: number, deps: AbdicateDeps): AbdicateReason | undefined => {
  if (requesterBuildId <= deps.buildId) return AbdicateReason.Stale;
  if (deps.onAbdicate === undefined) return AbdicateReason.Unsupported;
  if (deps.relay.pendingCount() > 0 || hasRecentTraffic(deps.relay, deps.quietWindowMs)) {
    return AbdicateReason.Busy;
  }
  return undefined;
};

const refuse = (res: ServerResponse, status: HttpStatus, reason: AbdicateReason): void => {
  writeJson(res, status, { ok: false, reason });
};

export const answerAbdicate = async (
  req: IncomingMessage,
  res: ServerResponse,
  deps: AbdicateDeps,
): Promise<void> => {
  if (!hasContentType(req.headers['content-type'], JSON_CONTENT_TYPE)) {
    refuse(res, HttpStatus.UnsupportedMediaType, AbdicateReason.UnsupportedMediaType);
    return;
  }
  const request = AbdicateRequestSchema.safeParse(await readJsonBody(req));
  if (!request.success) {
    refuse(res, HttpStatus.BadRequest, AbdicateReason.Invalid);
    return;
  }
  const refusal = refusalOf(request.data.buildId, deps);
  if (refusal !== undefined) {
    refuse(res, HttpStatus.Ok, refusal);
    return;
  }
  deps.log(`[leader] abdicating to a newer build (${request.data.buildId} > ${deps.buildId})`);
  res.once('finish', () => deps.onAbdicate?.());
  writeJson(res, HttpStatus.Ok, { ok: true });
};
