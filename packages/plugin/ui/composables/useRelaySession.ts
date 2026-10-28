import { DEFAULT_PORT, PROTOCOL_VERSION } from '@figma-forge/core';
import { tryOnScopeDispose, useDocumentVisibility } from '@vueuse/core';
import { computed, type ComputedRef, onMounted, type Ref, ref } from 'vue';

import type { PluginContextEvent } from '../../protocol/bridge.js';
import { RelayClient } from '../relay/client.js';
import { buildDiagnosticBundle } from '../relay/diagnostics.js';
import type { RelayClientState } from '../relay/state.js';
import { answerHostYields } from '../sandbox/host-yield-replies.js';
import { createToolBridge } from '../sandbox/tool-bridge.js';
import { useActivityAnnouncer } from './useActivityAnnouncer.js';

export interface RelaySession {
  readonly state: Ref<RelayClientState>;
  readonly context: Ref<PluginContextEvent | null>;
  readonly busy: ComputedRef<boolean>;
  readonly sessionId: string;
  readonly buildDiagnostics: () => string;
}

const logToConsole = (message: string): void => console.log(message);

const createPanelRelayClient = (appVersion: string): RelayClient =>
  new RelayClient({ ports: [DEFAULT_PORT], clientVersion: appVersion, log: logToConsole });

const mirrorState = (
  client: RelayClient,
  state: Ref<RelayClientState>,
  onConnected: () => void,
): (() => void) => {
  let wasConnected = false;
  return client.subscribe(next => {
    state.value = next;
    const isConnected = next.status === 'connected';
    if (isConnected && !wasConnected) onConnected();
    wasConnected = isConnected;
  });
};

const bindLifecycle = (client: RelayClient, teardown: readonly (() => void)[]): void => {
  tryOnScopeDispose(() => {
    for (const stop of teardown) stop();
    client.disconnect().catch(() => {});
  });
  onMounted(() => {
    client.connect().catch(err => console.warn('[relay-client] initial connect failed:', err));
  });
};

export const useRelaySession = (appVersion: string): RelaySession => {
  const visibility = useDocumentVisibility();
  const stopHostYields = answerHostYields(() => visibility.value === 'hidden');
  const client = createPanelRelayClient(appVersion);
  const bridge = createToolBridge({ log: logToConsole });
  client.setToolHandler(bridge.handler);

  const state = ref<RelayClientState>(client.getState());
  const announcer = useActivityAnnouncer({ client, state, visibility });
  const stopState = mirrorState(client, state, announcer.announce);
  bindLifecycle(client, [stopState, stopHostYields, announcer.stop, () => bridge.dispose()]);

  return {
    state,
    context: announcer.context,
    busy: computed(() => state.value.activity.some(entry => entry.status === 'pending')),
    sessionId: client.sessionId,
    buildDiagnostics: () =>
      buildDiagnosticBundle(state.value, announcer.context.value, {
        pluginVersion: appVersion,
        protocolVersion: PROTOCOL_VERSION,
        sessionId: client.sessionId,
        userAgent: navigator.userAgent,
      }),
  };
};
