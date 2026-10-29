import type { ServerResponse } from 'node:http';

import type { Relay } from '../relay/relay.js';
import { writeJson } from './http-replies.js';
import { HttpStatus } from './leader-wire.js';

export interface PingDeps {
  readonly relay: Relay;
  readonly serverVersion: string;
  readonly buildId: number;
}

export const answerPing = (
  res: ServerResponse,
  { relay, serverVersion, buildId }: PingDeps,
): void => {
  writeJson(res, HttpStatus.Ok, {
    ok: true,
    serverVersion,
    buildId,
    plugins: relay.sessions.connected().length,
    activeSessionId: relay.pickActiveSessionId() ?? null,
    sessions: relay.listSessionInfo(),
  });
};
