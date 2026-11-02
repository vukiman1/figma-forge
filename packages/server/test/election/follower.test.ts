import { afterEach, describe, expect, it } from 'vitest';

import { Follower } from '../../src/election/follower.js';
import { attachFakePlugin, startLeader, startPlainServer, stopLeaders } from './leader-harness.js';

afterEach(stopLeaders);

describe('Follower', () => {
  it('ping returns true when leader is up', async () => {
    const b = await startLeader();
    const f = new Follower({ leaderUrl: `http://127.0.0.1:${b.port}` });
    expect(await f.ping()).toBe(true);
  });

  it('ping returns false for unreachable leader', async () => {
    const f = new Follower({
      leaderUrl: 'http://127.0.0.1:1',
      pingTimeoutMs: 200,
    });
    expect(await f.ping()).toBe(false);
  });

  it('ping returns false when the port is held by a non-figma-forge server', async () => {
    const port = await startPlainServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('not a figma-forge leader');
    });
    const f = new Follower({ leaderUrl: `http://127.0.0.1:${port}` });
    expect(await f.ping()).toBe(false);
  });

  it('resolveActiveSession reads the leader-picked session id', async () => {
    const b = await startLeader();
    const f = new Follower({ leaderUrl: `http://127.0.0.1:${b.port}` });
    expect(await f.resolveActiveSession()).toBeUndefined();

    await attachFakePlugin(b, async () => ({ noop: true }));
    expect(await f.resolveActiveSession()).toBe(b.relay.pickActiveSessionId());
  });

  it('resolveActiveSession returns undefined when the leader is unreachable', async () => {
    const f = new Follower({ leaderUrl: 'http://127.0.0.1:1', pingTimeoutMs: 200 });
    expect(await f.resolveActiveSession()).toBeUndefined();
  });

  it('leaderInfo reports version and buildId of a confirmed leader', async () => {
    const b = await startLeader({ serverVersion: 'test-2.0.0', buildId: 777 });
    const f = new Follower({ leaderUrl: `http://127.0.0.1:${b.port}` });
    expect(await f.leaderInfo()).toEqual({ serverVersion: 'test-2.0.0', buildId: 777 });
  });

  it('leaderInfo is undefined for a non-figma-forge responder and an unreachable leader', async () => {
    const port = await startPlainServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ hello: 'world' }));
    });
    expect(
      await new Follower({ leaderUrl: `http://127.0.0.1:${port}` }).leaderInfo(),
    ).toBeUndefined();
    const dead = new Follower({ leaderUrl: 'http://127.0.0.1:1', pingTimeoutMs: 200 });
    expect(await dead.leaderInfo()).toBeUndefined();
  });

  it('requestAbdication maps a 404 from a leader that predates the endpoint to unsupported', async () => {
    const port = await startPlainServer((_req, res) => {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
    });
    const f = new Follower({ leaderUrl: `http://127.0.0.1:${port}` });
    expect(await f.requestAbdication(200)).toBe('unsupported');
  });

  it('requestAbdication maps transport failure to error', async () => {
    const f = new Follower({ leaderUrl: 'http://127.0.0.1:1', pingTimeoutMs: 200 });
    expect(await f.requestAbdication(200)).toBe('error');
  });

  const bodyWatcher = (
    status: number,
    onCancel: () => void = () => {},
  ): { res: Response; cancelled: () => boolean } => {
    let cancelled = false;
    const body = new ReadableStream({
      cancel() {
        cancelled = true;
        onCancel();
      },
    });
    return { res: new Response(body, { status }), cancelled: () => cancelled };
  };

  it('releases the response body when a ping is answered with a non-2xx, so the socket is not held until timeout', async () => {
    const { res, cancelled } = bodyWatcher(503);
    const f = new Follower({
      leaderUrl: 'http://127.0.0.1:1',
      pingTimeoutMs: 200,
      fetch: async () => res,
    });
    expect(await f.ping()).toBe(false);
    expect(cancelled()).toBe(true);
  });

  it('releases the response body on the abdication paths that never read it', async () => {
    for (const [status, outcome] of [
      [404, 'unsupported'],
      [500, 'error'],
    ] as const) {
      const { res, cancelled } = bodyWatcher(status);
      const f = new Follower({
        leaderUrl: 'http://127.0.0.1:1',
        pingTimeoutMs: 200,
        fetch: async () => res,
      });
      expect(await f.requestAbdication(200)).toBe(outcome);
      expect(cancelled()).toBe(true);
    }
  });

  it('still reports the diagnosed outcome when releasing the body itself fails, since the release is fire-and-forget', async () => {
    const { res } = bodyWatcher(404, () => {
      throw new Error('cancel failed');
    });
    const f = new Follower({
      leaderUrl: 'http://127.0.0.1:1',
      pingTimeoutMs: 200,
      fetch: async () => res,
    });
    expect(await f.requestAbdication(200)).toBe('unsupported');
  });
});
