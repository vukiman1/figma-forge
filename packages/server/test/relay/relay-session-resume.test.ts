import { newId } from '@figma-forge/core';
import { afterEach, describe, expect, it } from 'vitest';

import { closeCodeOf, connect, delay, hello, startRelay, stopRelays } from './relay-harness.js';

afterEach(stopRelays);

describe('Relay session resume', () => {
  it('resumes the session when the same sessionId reconnects within the grace window', async () => {
    const { port, relay } = await startRelay({ disconnectGraceMs: 1_000 });
    const sessionId = newId();
    const first = await connect(port);
    expect((await hello(first, sessionId)).sessionResumed).toBe(false);
    const closed = closeCodeOf(first);
    first.close();
    await closed;

    const second = await connect(port);
    expect((await hello(second, sessionId)).sessionResumed).toBe(true);
    expect(relay.sessions.connected()).toHaveLength(1);
    second.close();
  });

  it('expires the session after the grace window passes without a reconnect', async () => {
    const { port, relay } = await startRelay({ disconnectGraceMs: 50 });
    const sessionId = newId();
    const first = await connect(port);
    await hello(first, sessionId);
    const closed = closeCodeOf(first);
    first.close();
    await closed;

    await delay(200);
    expect(relay.sessions.get(sessionId)).toBeUndefined();
    const second = await connect(port);
    expect((await hello(second, sessionId)).sessionResumed).toBe(false);
    second.close();
  });

  it('replaces the existing socket when a new hello arrives before the old close fires', async () => {
    const { port, relay } = await startRelay();
    const sessionId = newId();
    const first = await connect(port);
    await hello(first, sessionId);
    const firstClosed = closeCodeOf(first);

    const second = await connect(port);
    expect((await hello(second, sessionId)).sessionResumed).toBe(true);
    await firstClosed;
    expect(relay.sessions.connected()).toHaveLength(1);
    second.close();
  });

  it('accepts multiple concurrent plugin connections', async () => {
    const { port, relay } = await startRelay();
    const first = await connect(port);
    await hello(first, newId());
    const second = await connect(port);
    await hello(second, newId());

    expect(relay.sessions.list()).toHaveLength(2);
    first.close();
    second.close();
  });
});
