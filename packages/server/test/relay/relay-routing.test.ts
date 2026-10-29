import { newId } from '@figma-forge/core';
import { afterEach, describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';

import type { Relay } from '../../src/relay/relay.js';
import {
  connect,
  delay,
  hello,
  openPlugin,
  sendActivity,
  startRelay,
  stopRelays,
} from './relay-harness.js';

afterEach(stopRelays);

interface TwoPlugins {
  readonly wsA: WebSocket;
  readonly wsB: WebSocket;
  readonly sidA: string;
  readonly sidB: string;
}

const openTwoPlugins = async (relay: Relay, port: number): Promise<TwoPlugins> => {
  const sidA = newId();
  const sidB = newId();
  const wsA = await openPlugin(port, sidA);
  await delay(5);
  const wsB = await openPlugin(port, sidB);
  expect(relay.pickActiveSession()?.id).toBe(sidB);
  await delay(5);
  return { wsA, wsB, sidA, sidB };
};

const closeAll = (plugins: TwoPlugins): void => {
  plugins.wsA.close();
  plugins.wsB.close();
};

describe('Relay routing', () => {
  it('routes to the session whose plugin last sent $activity, and labels it with its file and page', async () => {
    const { port, relay } = await startRelay();
    const plugins = await openTwoPlugins(relay, port);

    sendActivity(plugins.wsA, plugins.sidA, {
      fileName: 'Project A',
      pageId: 'p-1',
      pageName: 'Cover',
    });
    await delay(20);

    expect(relay.pickActiveSession()).toMatchObject({
      id: plugins.sidA,
      fileName: 'Project A',
      pageName: 'Cover',
    });
    closeAll(plugins);
  });

  it('records the file of a background session without letting it take routing', async () => {
    const { port, relay } = await startRelay();
    const plugins = await openTwoPlugins(relay, port);

    sendActivity(plugins.wsA, plugins.sidA, {
      fileName: 'Background File',
      pageId: 'p-9',
      pageName: 'Hidden',
      foreground: false,
    });
    await delay(20);

    expect(relay.sessions.get(plugins.sidA)?.fileName).toBe('Background File');
    expect(relay.listSessionInfo().find(info => info.id === plugins.sidA)?.fileName).toBe(
      'Background File',
    );
    expect(relay.pickActiveSession()?.id).toBe(plugins.sidB);
    closeAll(plugins);
  });

  it('treats a plugin that sends no foreground flag as the foreground, as older plugins only emitted from visible tabs', async () => {
    const { port, relay } = await startRelay();
    const plugins = await openTwoPlugins(relay, port);

    sendActivity(plugins.wsA, plugins.sidA, {
      fileName: 'Old Plugin File',
      pageId: 'p-1',
      pageName: 'Cover',
    });
    await delay(20);

    expect(relay.pickActiveSession()?.id).toBe(plugins.sidA);
    closeAll(plugins);
  });

  it('keeps routing where it was when a throttled plugin reconnects under its session id, since a reconnect is not user interaction', async () => {
    const { port, relay } = await startRelay();
    const plugins = await openTwoPlugins(relay, port);

    plugins.wsA.close();
    await delay(10);
    const reconnected = await connect(port);
    expect((await hello(reconnected, plugins.sidA)).sessionResumed).toBe(true);

    expect(relay.pickActiveSession()?.id).toBe(plugins.sidB);
    reconnected.close();
    plugins.wsB.close();
  });
});
