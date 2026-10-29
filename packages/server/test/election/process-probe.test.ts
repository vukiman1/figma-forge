import { type ChildProcess, spawn } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

import { osProcessProbe } from '../../src/election/process-probe.js';
import { asPlatform, restorePlatform } from './lock-fixtures.js';

const children: ChildProcess[] = [];

afterEach(() => {
  for (const child of children) child.kill('SIGKILL');
  children.length = 0;
  restorePlatform();
});

const pause = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const spawnIdle = async (): Promise<number> => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  children.push(child);
  await pause(400);
  return child.pid ?? 0;
};

const isStopped = (pid: number): boolean | undefined =>
  osProcessProbe.inspect(pid)?.state.startsWith('T');

describe('osProcessProbe', () => {
  it('never shells out to ps or signals on Windows, even for a pid that certainly exists', () => {
    asPlatform('win32');
    expect(osProcessProbe.inspect(process.pid)).toBeUndefined();
    expect(osProcessProbe.resume(process.pid)).toBe(false);
  });

  it.each([0, -1, 1.5, Number.NaN])('refuses to probe or signal pid %s', pid => {
    expect(osProcessProbe.inspect(pid)).toBeUndefined();
    expect(osProcessProbe.resume(pid)).toBe(false);
  });
});

describe.skipIf(process.platform === 'win32')('osProcessProbe against the real OS', () => {
  it('reads the state and start time of a live process', async () => {
    const pid = await spawnIdle();
    const live = osProcessProbe.inspect(pid);
    expect(live?.state).toMatch(/^[A-Z]/);
    expect(Math.abs((live?.startedAt ?? 0) - Date.now())).toBeLessThan(30_000);
  });

  it('sees a suspended process as stopped, and SIGCONT brings it back', async () => {
    const pid = await spawnIdle();
    expect(isStopped(pid)).toBe(false);
    process.kill(pid, 'SIGSTOP');
    await pause(200);
    expect(isStopped(pid)).toBe(true);
    expect(osProcessProbe.resume(pid)).toBe(true);
    await pause(200);
    expect(isStopped(pid)).toBe(false);
  });

  it('is undefined for a pid that no longer exists', async () => {
    const pid = await spawnIdle();
    process.kill(pid, 'SIGKILL');
    await pause(300);
    expect(osProcessProbe.inspect(pid)).toBeUndefined();
  });
});
