import { afterEach, describe, expect, it } from 'vitest';

import { portConflictMessage } from '../../src/election/port-conflict-message.js';
import { asPlatform, restorePlatform } from './lock-fixtures.js';

afterEach(restorePlatform);

const identified = { pid: 777, buildId: 1, serverVersion: '0.4.0' };

describe('portConflictMessage', () => {
  it('does not claim an unidentified holder is non-Figma Forge, since a wedged Figma Forge leader is the usual one', () => {
    const msg = portConflictMessage(3055);
    expect(msg).toContain('3055');
    expect(msg).toContain('Free that port');
    expect(msg).not.toContain('non-Figma Forge');
    expect(msg).not.toContain('pid');
  });

  it('names the pid and the kill command for an identified holder', () => {
    const msg = portConflictMessage(3055, { ...identified, stopped: false, resumed: false });
    expect(msg).toContain('pid 777');
    expect(msg).toContain('v0.4.0');
    expect(msg).toContain('kill 777');
    expect(msg).not.toContain('SIGCONT');
  });

  it('mentions SIGCONT only when one was actually sent', () => {
    const stopped = { ...identified, stopped: true };
    expect(portConflictMessage(3055, { ...stopped, resumed: true })).toContain(
      'SIGCONT was just sent',
    );
    const notResumed = portConflictMessage(3055, { ...stopped, resumed: false });
    expect(notResumed).toContain('could not be resumed');
    expect(notResumed).not.toContain('SIGCONT was just sent');
  });

  it('gives the remedy in a shell Windows actually has', () => {
    asPlatform('win32');
    const msg = portConflictMessage(3055);
    expect(msg).toContain('netstat -ano | findstr :3055');
    expect(msg).not.toContain('lsof');
  });

  it('gives the POSIX remedy everywhere else, asserted by stubbing rather than by the host it runs on', () => {
    asPlatform('linux');
    const msg = portConflictMessage(3055);
    expect(msg).toContain('lsof -iTCP:3055 -sTCP:LISTEN');
    expect(msg).not.toContain('netstat');
  });
});
