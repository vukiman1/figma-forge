import { newId } from '@figma-forge/core';
import { afterEach, describe, expect, it } from 'vitest';

import {
  answerToolCalls,
  connect,
  hello,
  openPlugin,
  startRelay,
  stopRelays,
} from './relay-harness.js';

afterEach(stopRelays);

const OLD_PLUGIN = { clientVersion: '0.0.1' } as const;
const SKEWED = /older than this server/i;

describe('Relay plugin skew', () => {
  it('serves a plugin below the floor instead of refusing it, since a refused old plugin retries the handshake forever', async () => {
    const b = await startRelay();
    const ws = await connect(b.port);
    const sessionId = newId();
    const result = await hello(ws, sessionId, OLD_PLUGIN);

    expect(b.relay.sessions.connected()).toHaveLength(1);
    expect(result.skewNotice).toMatch(SKEWED);
    expect(result.skewNotice).toMatch(/silently ignored/i);
    expect(result.skewNotice).toMatch(/Update the plugin/);
    expect(b.relay.skewNotice(sessionId)).toMatch(SKEWED);
    ws.close();
  });

  it('serves a plugin whose version cannot be identified, and warns about it', async () => {
    const { port } = await startRelay();
    const ws = await connect(port);
    const result = await hello(ws, newId(), { clientVersion: 'nightly' });

    expect(result.skewNotice).toMatch(SKEWED);
    ws.close();
  });

  it('attributes each concurrent call to the plugin that answered it, not to the most active one', async () => {
    const { port, relay } = await startRelay();
    const staleId = newId();
    const currentId = newId();
    const oldPlugin = await openPlugin(port, staleId, OLD_PLUGIN);
    const newPlugin = await openPlugin(port, currentId);
    answerToolCalls(oldPlugin, staleId, { ok: true });
    answerToolCalls(newPlugin, currentId, { ok: true });

    const seen = new Map<string, string | null>();
    await Promise.all([
      relay.sendRequest('get_document', {}, 5000, staleId, served =>
        seen.set('old', relay.skewNotice(served)),
      ),
      relay.sendRequest('get_document', {}, 5000, currentId, served =>
        seen.set('new', relay.skewNotice(served)),
      ),
    ]);

    expect(seen.get('old')).toMatch(SKEWED);
    expect(seen.get('new')).toBeNull();
  });

  it('explains the skew in full once per session, then in one line that still names the risk', async () => {
    const { port, relay } = await startRelay();
    const sessionId = newId();
    const ws = await openPlugin(port, sessionId, OLD_PLUGIN);

    const first = relay.skewNotice(sessionId);
    const second = relay.skewNotice(sessionId);
    const third = relay.skewNotice(sessionId);

    expect(first).toMatch(/pnpm build/);
    expect(second).toMatch(SKEWED);
    expect(second).toMatch(/unverified/i);
    expect(second).not.toMatch(/pnpm build/);
    expect(second?.length ?? 0).toBeLessThan((first?.length ?? 0) / 2);
    expect(third).toBe(second);
    ws.close();
  });

  it('attributes a timeout too, since an old plugin that drops arguments like budget can itself run long', async () => {
    const { port, relay } = await startRelay();
    const ws = await openPlugin(port, newId(), OLD_PLUGIN);

    let attributed: string | null = 'unset';
    await expect(
      relay.sendRequest('get_design_context', {}, 60, undefined, served => {
        attributed = relay.skewNotice(served);
      }),
    ).rejects.toThrow(/timeout/i);

    expect(attributed).toMatch(SKEWED);
    ws.close();
  });

  it('says nothing about skew for a current plugin', async () => {
    const { port, relay } = await startRelay();
    const sessionId = newId();
    const ws = await connect(port);
    const result = await hello(ws, sessionId);

    expect(result.skewNotice).toBeUndefined();
    expect(relay.skewNotice(sessionId)).toBeNull();
    ws.close();
  });

  it('admits a plugin newer than the server without warning, since it understands every argument', async () => {
    const { port } = await startRelay();
    const ws = await connect(port);
    const result = await hello(ws, newId(), { clientVersion: '99.0.0' });

    expect(result.skewNotice).toBeUndefined();
    ws.close();
  });
});
