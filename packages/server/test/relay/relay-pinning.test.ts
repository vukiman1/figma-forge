import { type Envelope, newId } from '@figma-forge/core';
import { afterEach, describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';

import type { Relay } from '../../src/relay/relay.js';
import {
  collectToolCalls,
  delay,
  openPlugin,
  reply,
  sendActivity,
  startRelay,
  stopRelays,
} from './relay-harness.js';

afterEach(stopRelays);

const callId = (calls: readonly Envelope[], index: number): string => {
  const call = calls[index];
  if (call === undefined) throw new Error(`expected call #${index}, collected ${calls.length}`);
  return call.id;
};

interface TwoPlugins {
  readonly wsA: WebSocket;
  readonly wsB: WebSocket;
  readonly sidA: string;
  readonly sidB: string;
  readonly callsA: readonly Envelope[];
  readonly callsB: readonly Envelope[];
}

const openTwoPlugins = async (relay: Relay, port: number): Promise<TwoPlugins> => {
  const sidA = newId();
  const sidB = newId();
  const wsA = await openPlugin(port, sidA);
  await delay(5);
  const wsB = await openPlugin(port, sidB);
  expect(relay.pickActiveSessionId()).toBe(sidB);
  return { wsA, wsB, sidA, sidB, callsA: collectToolCalls(wsA), callsB: collectToolCalls(wsB) };
};

describe('Relay session pinning', () => {
  it('routes a pinned request to its session even when another is more active', async () => {
    const { port, relay } = await startRelay();
    const { wsA, wsB, sidA, callsA, callsB } = await openTwoPlugins(relay, port);

    const pending = relay.sendRequest('get_design_context', { a: 1 }, 5_000, sidA);
    await delay(20);
    expect(callsB).toHaveLength(0);
    expect(callsA).toHaveLength(1);

    reply(wsA, callId(callsA, 0), sidA, { ok: 'A' });
    await expect(pending).resolves.toEqual({ ok: 'A' });
    wsA.close();
    wsB.close();
  });

  it('keeps a pinned group together when activity flips mid-flight', async () => {
    const { port, relay } = await startRelay();
    const { wsA, wsB, sidA, sidB, callsA, callsB } = await openTwoPlugins(relay, port);

    const first = relay.sendRequest('get_design_context', {}, 5_000, sidA);
    await delay(20);
    reply(wsA, callId(callsA, 0), sidA, { n: 1 });
    await first;

    sendActivity(wsB, sidB, { fileName: 'B', pageId: 'p', pageName: 'P' });
    await delay(20);
    expect(relay.pickActiveSessionId()).toBe(sidB);

    const second = relay.sendRequest('get_local_components', {}, 5_000, sidA);
    await delay(20);
    expect(callsB).toHaveLength(0);
    expect(callsA).toHaveLength(2);
    reply(wsA, callId(callsA, 1), sidA, { n: 2 });
    await expect(second).resolves.toEqual({ n: 2 });
    wsA.close();
    wsB.close();
  });

  it('rejects a request pinned to a session that is not connected', async () => {
    const { port, relay } = await startRelay();
    const ws = await openPlugin(port);

    await expect(
      relay.sendRequest('get_design_context', {}, 5_000, 'ghost-session'),
    ).rejects.toThrow(/pinned session not connected/);
    ws.close();
  });
});
