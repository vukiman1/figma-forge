import { vi } from 'vitest';
import { type App, createApp, h, nextTick } from 'vue';

import { createPluginContextEvent, type PluginContextEvent } from '../../protocol/bridge.js';
import type { RelayClientState } from '../../ui/relay/state.js';

export const BASE_STATE: RelayClientState = {
  status: 'idle',
  port: null,
  sessionResumed: false,
  serverVersion: null,
  lastError: null,
  versionNotice: null,
  foregroundFlag: true,
  connectedAt: null,
  reconnectCount: 0,
  totalCalls: 0,
  failedCalls: 0,
  activity: [],
};

const createRelayMocks = () => {
  let emitState: ((state: RelayClientState) => void) | null = null;
  let clientOptions: unknown = null;
  return {
    notifyActivity: vi.fn<(params: unknown) => void>(),
    wake: vi.fn<() => void>(),
    connect: vi.fn<() => Promise<void>>(() => Promise.resolve()),
    disconnect: vi.fn<() => Promise<void>>(() => Promise.resolve()),
    setToolHandler: vi.fn<(handler: unknown) => void>(),
    unsubscribe: vi.fn<() => void>(),
    bridgeDispose: vi.fn<() => void>(),
    bridgeHandler: vi.fn<() => void>(),
    getEmitState: () => emitState,
    setEmitState: (fn: (state: RelayClientState) => void) => {
      emitState = fn;
    },
    getClientOptions: () => clientOptions,
    setClientOptions: (options: unknown) => {
      clientOptions = options;
    },
  };
};

export const relayMocks = createRelayMocks();

vi.mock('../../ui/relay/client.js', () => ({
  RelayClient: class {
    sessionId = 'session-abcdef123456';
    setToolHandler = relayMocks.setToolHandler;
    getState = (): RelayClientState => BASE_STATE;
    subscribe = (fn: (state: RelayClientState) => void): (() => void) => {
      relayMocks.setEmitState(fn);
      return relayMocks.unsubscribe;
    };
    notifyActivity = relayMocks.notifyActivity;
    wake = relayMocks.wake;
    connect = relayMocks.connect;
    disconnect = relayMocks.disconnect;
    constructor(options: unknown) {
      relayMocks.setClientOptions(options);
    }
  },
}));

vi.mock('../../ui/sandbox/tool-bridge.js', () => ({
  createToolBridge: () => ({
    handler: relayMocks.bridgeHandler,
    dispose: relayMocks.bridgeDispose,
  }),
}));

const { useRelaySession } = await import('../../ui/composables/useRelaySession.js');

export type Session = ReturnType<typeof useRelaySession>;

export const emitState = (over: Partial<RelayClientState>): void => {
  relayMocks.getEmitState()?.({ ...BASE_STATE, ...over });
};

export const setVisibility = async (value: DocumentVisibilityState): Promise<void> => {
  Object.defineProperty(document, 'visibilityState', { value, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
  await nextTick();
};

export const deliver = (pluginMessage: unknown): void => {
  globalThis.dispatchEvent(new MessageEvent('message', { data: { pluginMessage } }));
};

export const pushContext = (overrides: Partial<PluginContextEvent> = {}): void => {
  deliver({
    ...createPluginContextEvent({
      fileName: 'Design File',
      pageId: 'page-1',
      pageName: 'Page 1',
      selectionCount: 0,
      selection: [],
      editorType: 'figma',
      mode: 'default',
      apiVersion: '1.0.0',
    }),
    ...overrides,
  });
};

const mounted: App[] = [];

export const withSession = (): Session => {
  let session: Session | undefined;
  const app = createApp({
    setup() {
      session = useRelaySession('1.2.3');
      return () => h('div');
    },
  });
  app.mount(document.createElement('div'));
  mounted.push(app);
  if (session === undefined) throw new Error('useRelaySession did not run during setup');
  return session;
};

export const unmountLatest = (): void => {
  mounted.pop()?.unmount();
};

export const unmountAll = (): void => {
  while (mounted.length > 0) unmountLatest();
};
