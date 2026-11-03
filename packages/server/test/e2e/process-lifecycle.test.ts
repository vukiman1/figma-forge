import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { leaderLockPath } from '../../src/election/leader-lock.js';
import { onText } from './_helpers.js';

const DIST_ENTRY = join(import.meta.dirname, '..', '..', 'dist', 'index.mjs');

const freePort = async (): Promise<number> => {
  const s = createServer();
  await new Promise<void>(resolve => s.listen(0, '127.0.0.1', () => resolve()));
  const port = (s.address() as AddressInfo).port;
  await new Promise<void>(resolve => s.close(() => resolve()));
  return port;
};

interface Server {
  child: ChildProcess;
  stderr: () => string;
  exited: () => { code: number | null } | null;
}

const servers: Server[] = [];

afterEach(() => {
  for (const s of servers) {
    if (s.exited() === null) s.child.kill('SIGKILL');
  }
  servers.length = 0;

  for (const port of usedPorts) rmSync(leaderLockPath(port), { force: true });
  usedPorts.clear();
});

const usedPorts = new Set<number>();

const spawnServer = (port: number): Server => {
  usedPorts.add(port);
  const child = spawn(process.execPath, [DIST_ENTRY], {
    env: { ...process.env, FIGMA_FORGE_PORT: String(port) },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stderr = '';
  onText(child.stderr, text => {
    stderr += text;
  });
  let exit: { code: number | null } | null = null;
  child.on('exit', code => {
    exit = { code };
  });

  child.stdin?.on('error', () => {});
  const s: Server = { child, stderr: () => stderr, exited: () => exit };
  servers.push(s);
  return s;
};

const waitFor = async (pred: () => boolean, label: string, timeoutMs: number): Promise<void> => {
  const t0 = Date.now();
  while (!pred()) {
    if (Date.now() - t0 > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    // eslint-disable-next-line no-await-in-loop -- polling loop
    await new Promise<void>(resolve => setTimeout(resolve, 25));
  }
};

describe.skipIf(!existsSync(DIST_ENTRY))('process lifecycle (built dist)', () => {
  it(
    'leader exits promptly on stdin EOF and a live follower takes over the port',
    { timeout: 20_000 },
    async () => {
      const port = await freePort();

      const leader = spawnServer(port);
      await waitFor(() => leader.stderr().includes('ready as leader'), 'leader ready', 8_000);

      const follower = spawnServer(port);
      await waitFor(() => follower.stderr().includes('ready as follower'), 'follower ready', 8_000);

      await new Promise<void>(resolve => setTimeout(resolve, 1_500));

      leader.child.stdin?.end();
      await waitFor(() => leader.exited() !== null, 'leader exit after stdin EOF', 8_000);
      expect(leader.exited()?.code).toBe(0);

      await waitFor(() => follower.stderr().includes('became LEADER'), 'follower takeover', 8_000);
      expect(follower.exited()).toBeNull();

      follower.child.stdin?.end();
      await waitFor(() => follower.exited() !== null, 'promoted follower exit', 8_000);
      expect(follower.exited()?.code).toBe(0);
    },
  );

  describe.skipIf(process.platform === 'win32')(
    'a leader that holds the port but stops answering',
    () => {
      it(
        'names it, wakes it, and is a follower again — without anyone killing anything',
        { timeout: 70_000 },
        async () => {
          const port = await freePort();
          const leader = spawnServer(port);
          await waitFor(() => leader.stderr().includes('ready as leader'), 'leader ready', 8_000);
          const follower = spawnServer(port);
          await waitFor(
            () => follower.stderr().includes('ready as follower'),
            'follower ready',
            8_000,
          );
          await new Promise<void>(resolve => setTimeout(resolve, 1_000));

          leader.child.kill('SIGSTOP');
          try {
            const diagnosed = (): boolean => {
              const log = follower.stderr();
              return (
                log.includes(`port holder pid ${leader.child.pid} is suspended`) &&
                log.includes('PORT CONFLICT') &&
                log.includes(`kill ${leader.child.pid}`)
              );
            };
            await waitFor(diagnosed, 'wedge diagnosed', 45_000);

            await waitFor(
              () => /became FOLLOWER/.test(follower.stderr().split('PORT CONFLICT')[1] ?? ''),
              'follower resumes following the revived leader',
              20_000,
            );
            expect(leader.exited()).toBeNull();
          } finally {
            leader.child.kill('SIGCONT');
          }
        },
      );
    },
  );

  it(
    'exits and frees the port when the transport dies under it, and a follower takes over',
    { timeout: 20_000 },
    async () => {
      const port = await freePort();

      const leader = spawnServer(port);
      await waitFor(() => leader.stderr().includes('ready as leader'), 'leader ready', 8_000);
      const follower = spawnServer(port);
      await waitFor(() => follower.stderr().includes('ready as follower'), 'follower ready', 8_000);

      const send = (msg: unknown): void => {
        leader.child.stdin?.write(`${JSON.stringify(msg)}\n`, () => {});
      };
      send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'transport-death', version: '0' },
        },
      });
      await new Promise<void>(resolve => setTimeout(resolve, 500));

      send({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'import_image',
          arguments: { data: 'A'.repeat(12 * 1024 * 1024), x: 0, y: 0 },
        },
      });

      await waitFor(() => leader.exited() !== null, 'leader exit after transport death', 9_000);
      expect(leader.exited()?.code).toBe(0);

      expect(leader.stderr()).toContain('stdio transport error');

      await waitFor(() => follower.stderr().includes('became LEADER'), 'follower takeover', 9_000);
      expect(follower.exited()).toBeNull();
    },
  );
});
