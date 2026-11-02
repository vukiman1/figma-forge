import { errorMessage } from '../error-message.js';
import { isAddressInUse } from './bind-port.js';
import { delay } from './delay.js';
import type { Node } from './node.js';

const ABDICATION_GRAB_ATTEMPTS = 20;
const ABDICATION_GRAB_DELAY_MS = 50;

enum GrabAttempt {
  Won = 'won',
  Taken = 'taken',
  Failed = 'failed',
}

type Logger = (msg: string) => void;

const tryBind = async (node: Node, log: Logger): Promise<GrabAttempt> => {
  try {
    await node.becomeLeader();
    return GrabAttempt.Won;
  } catch (error) {
    if (isAddressInUse(error)) return GrabAttempt.Taken;
    log(`[election] post-abdication takeover failed: ${errorMessage(error)}`);
    return GrabAttempt.Failed;
  }
};

const grab = async (node: Node, log: Logger, attemptsLeft: number): Promise<void> => {
  if (attemptsLeft === 0) {
    log('[election] post-abdication grab lost — another node took the port');
    return;
  }
  if ((await tryBind(node, log)) !== GrabAttempt.Taken) return;
  await delay(ABDICATION_GRAB_DELAY_MS);
  await grab(node, log, attemptsLeft - 1);
};

export const grabReleasedPort = (node: Node, log: Logger): Promise<void> =>
  grab(node, log, ABDICATION_GRAB_ATTEMPTS);
