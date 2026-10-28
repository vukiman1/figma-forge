import { DEFAULT_PORT } from '@figma-forge/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActivityEntry } from '../../ui/relay/state.js';
import {
  emitState,
  pushContext,
  relayMocks,
  setVisibility,
  unmountAll,
  unmountLatest,
  withSession,
} from './relay-session-fake.js';

describe('useRelaySession', () => {
  beforeEach(async () => {
    await setVisibility('visible');
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('lifecycle', () => {
    it('probes only the default port, which the relay leader always binds', () => {
      withSession();

      expect(relayMocks.getClientOptions()).toMatchObject({
        ports: [DEFAULT_PORT],
        clientVersion: '1.2.3',
      });
    });

    it('wires the sandbox bridge as the tool handler and connects on mount', () => {
      withSession();

      expect(relayMocks.setToolHandler).toHaveBeenCalledWith(relayMocks.bridgeHandler);
      expect(relayMocks.connect).toHaveBeenCalled();
    });

    it('mirrors relay state into a ref', () => {
      const session = withSession();
      expect(session.state.value.status).toBe('idle');

      emitState({ status: 'connected', port: 3055 });

      expect(session.state.value.status).toBe('connected');
      expect(session.state.value.port).toBe(3055);
    });

    it('tears down subscription, bridge and socket on unmount', () => {
      withSession();

      unmountLatest();

      expect(relayMocks.unsubscribe).toHaveBeenCalled();
      expect(relayMocks.bridgeDispose).toHaveBeenCalled();
      expect(relayMocks.disconnect).toHaveBeenCalled();
    });

    it('exposes the context pushed from the sandbox', () => {
      const session = withSession();
      expect(session.context.value).toBeNull();

      pushContext();

      expect(session.context.value?.fileName).toBe('Design File');
    });

    it('stops listening for context once unmounted', () => {
      const session = withSession();
      unmountLatest();

      pushContext();

      expect(session.context.value).toBeNull();
    });
  });

  describe('busy', () => {
    const entry = (id: string, status: ActivityEntry['status']): ActivityEntry => ({
      id,
      method: 'get_node',
      startedAt: 1000,
      status,
    });

    it('is quiet before anything has happened', () => {
      expect(withSession().busy.value).toBe(false);
    });

    it('stays quiet once every call has settled', () => {
      const session = withSession();

      emitState({ activity: [entry('a', 'ok'), entry('b', 'error')] });

      expect(session.busy.value).toBe(false);
    });

    it('reports a call in flight even when its row is scrolled out of view', () => {
      const session = withSession();

      emitState({ activity: [entry('a', 'ok'), entry('b', 'pending')] });

      expect(session.busy.value).toBe(true);
    });

    it('goes quiet again when the last call settles', () => {
      const session = withSession();
      emitState({ activity: [entry('a', 'pending')] });
      expect(session.busy.value).toBe(true);

      emitState({ activity: [entry('a', 'ok')] });

      expect(session.busy.value).toBe(false);
    });
  });

  describe('diagnostics', () => {
    it('builds a bundle carrying the session id, versions and context', () => {
      const session = withSession();
      pushContext();

      const bundle = JSON.parse(session.buildDiagnostics()) as {
        versions: { plugin: string; editorType: string | null };
        session: { id: string };
        context: { fileName: string } | null;
      };

      expect(bundle.versions.plugin).toBe('1.2.3');
      expect(bundle.versions.editorType).toBe('figma');
      expect(bundle.session.id).toBe('session-abcdef123456');
      expect(bundle.context?.fileName).toBe('Design File');
    });
  });
});
