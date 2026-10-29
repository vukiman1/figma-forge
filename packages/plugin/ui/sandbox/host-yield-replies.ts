import { createHostYield, parseHostYield } from '../../protocol/host-yield.js';
import { onSandboxMessage, postToSandbox } from './messaging.js';

export const answerHostYields = (isHidden: () => boolean): (() => void) =>
  onSandboxMessage(raw => {
    const message = parseHostYield(raw);
    if (message?.kind !== 'yield-request') return;
    postToSandbox(createHostYield(message.id, 'yield-resume', isHidden()));
  });
