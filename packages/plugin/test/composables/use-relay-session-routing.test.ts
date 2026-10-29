import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deliver,
  emitState,
  pushContext,
  relayMocks,
  setVisibility,
  unmountAll,
  withSession,
} from './relay-session-fake.js';

const FOREGROUND_CLAIM = {
  fileName: 'Design File',
  pageId: 'page-1',
  pageName: 'Page 1',
  foreground: true,
};

describe('useRelaySession activity routing', () => {
  beforeEach(async () => {
    await setVisibility('visible');
  });

  afterEach(() => {
    unmountAll();
    vi.restoreAllMocks();
  });

  it('claims routing when a context arrives while this tab is in the foreground', () => {
    withSession();

    pushContext();

    expect(relayMocks.notifyActivity).toHaveBeenCalledWith(FOREGROUND_CLAIM);
  });

  it('reports its file name while hidden so use_file can match it, without claiming routing', async () => {
    await setVisibility('hidden');
    withSession();

    pushContext();

    expect(relayMocks.notifyActivity).toHaveBeenCalledWith({
      ...FOREGROUND_CLAIM,
      foreground: false,
    });
  });

  it('wakes a stalled reconnect on a context push even while hidden, since postMessage is not throttled like background timers', async () => {
    await setVisibility('hidden');
    withSession();

    pushContext();

    expect(relayMocks.wake).toHaveBeenCalled();
    expect(relayMocks.notifyActivity).toHaveBeenCalledWith(
      expect.objectContaining({ foreground: false }),
    );
  });

  it('wakes throttled reconnect timers and re-claims routing when the tab returns to the foreground', async () => {
    await setVisibility('hidden');
    withSession();
    pushContext();
    expect(relayMocks.notifyActivity).toHaveBeenLastCalledWith(
      expect.objectContaining({ foreground: false }),
    );

    await setVisibility('visible');

    expect(relayMocks.wake).toHaveBeenCalled();
    expect(relayMocks.notifyActivity).toHaveBeenLastCalledWith(FOREGROUND_CLAIM);
  });

  it('emits nothing when the tab leaves the foreground, so a background file cannot steal routing', async () => {
    withSession();
    pushContext();
    vi.clearAllMocks();

    await setVisibility('hidden');

    expect(relayMocks.notifyActivity).not.toHaveBeenCalled();
  });

  it('ignores window focus, which Figma fires on every open tab when the app regains focus', () => {
    withSession();
    pushContext();
    vi.clearAllMocks();

    globalThis.dispatchEvent(new Event('focus'));

    expect(relayMocks.notifyActivity).not.toHaveBeenCalled();
  });

  it('re-announces its file whenever a connection comes up, since a new leader knows nothing of this session', () => {
    withSession();
    pushContext();
    vi.clearAllMocks();

    emitState({ status: 'connected' });

    expect(relayMocks.notifyActivity).toHaveBeenCalledWith(FOREGROUND_CLAIM);
  });

  it('re-announces a background file without claiming routing for it', async () => {
    withSession();
    pushContext();
    await setVisibility('hidden');
    vi.clearAllMocks();

    emitState({ status: 'connected' });

    expect(relayMocks.notifyActivity).toHaveBeenCalledWith(
      expect.objectContaining({ foreground: false }),
    );
  });

  it('announces once per connection, not on every state change', () => {
    withSession();
    pushContext();
    vi.clearAllMocks();

    emitState({ status: 'connected' });
    emitState({ status: 'connected', totalCalls: 1 });

    expect(relayMocks.notifyActivity).toHaveBeenCalledTimes(1);
  });

  it('announces again after a drop and reconnect', () => {
    withSession();
    pushContext();
    vi.clearAllMocks();

    emitState({ status: 'connected' });
    emitState({ status: 'reconnecting' });
    emitState({ status: 'connected' });

    expect(relayMocks.notifyActivity).toHaveBeenCalledTimes(2);
  });

  it('stays silent from the background against a server that reads any activity as a routing claim', async () => {
    withSession();
    emitState({ status: 'connected', foregroundFlag: false });
    await setVisibility('hidden');
    vi.clearAllMocks();

    pushContext();

    expect(relayMocks.notifyActivity).not.toHaveBeenCalled();
  });

  it('still claims routing from the foreground against such a server', () => {
    withSession();
    emitState({ status: 'connected', foregroundFlag: false });
    vi.clearAllMocks();

    pushContext();

    expect(relayMocks.notifyActivity).toHaveBeenCalledWith(
      expect.objectContaining({ foreground: true }),
    );
  });

  it('says nothing on connect before any context has given it a file identity', () => {
    withSession();

    emitState({ status: 'connected' });

    expect(relayMocks.notifyActivity).not.toHaveBeenCalled();
  });

  it('does not claim routing on returning to the foreground before any context has arrived', async () => {
    await setVisibility('hidden');
    withSession();

    await setVisibility('visible');

    expect(relayMocks.notifyActivity).not.toHaveBeenCalled();
  });

  it('reports the newest file and page after the user switches page', () => {
    withSession();
    pushContext();
    pushContext({ pageId: 'page-2', pageName: 'Page 2' });

    expect(relayMocks.notifyActivity).toHaveBeenLastCalledWith({
      ...FOREGROUND_CLAIM,
      pageId: 'page-2',
      pageName: 'Page 2',
    });
  });

  it('ignores window messages that are not plugin context events', () => {
    withSession();

    deliver({ type: 'something-else' });

    expect(relayMocks.notifyActivity).not.toHaveBeenCalled();
  });
});
