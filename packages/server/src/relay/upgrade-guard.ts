import type { IncomingMessage } from 'node:http';

import { isAllowedHost, isAllowedWsOrigin } from '../local-access.js';

type Logger = (msg: string) => void;

type UpgradeDecision = (isAllowed: boolean, code?: number, message?: string) => void;

const FORBIDDEN_STATUS = 403;

const refusalOf = (req: IncomingMessage): string | undefined => {
  const { host, origin } = req.headers;
  if (!isAllowedHost(host)) return `host ${host ?? '(none)'}`;
  if (!isAllowedWsOrigin(origin)) return `origin ${origin ?? '(none)'}`;
  return undefined;
};

export const createUpgradeGuard =
  (log: Logger) =>
  ({ req }: { req: IncomingMessage }, decide: UpgradeDecision): void => {
    const refusal = refusalOf(req);
    if (refusal === undefined) {
      decide(true);
      return;
    }
    log(`[relay] refused WebSocket upgrade for ${refusal}`);
    decide(false, FORBIDDEN_STATUS, 'Forbidden');
  };
