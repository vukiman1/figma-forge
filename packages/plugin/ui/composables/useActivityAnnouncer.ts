import { type Ref, ref, watch } from 'vue';

import type { PluginContextEvent } from '../../protocol/bridge.js';
import { activityClaim } from '../lib/activity-claim.js';
import type { RelayClient } from '../relay/client.js';
import type { RelayClientState } from '../relay/state.js';
import { onSandboxContext } from '../sandbox/messaging.js';

export interface ActivityAnnouncerSources {
  readonly client: Pick<RelayClient, 'notifyActivity' | 'wake'>;
  readonly state: Readonly<Ref<RelayClientState>>;
  readonly visibility: Readonly<Ref<DocumentVisibilityState>>;
}

export interface ActivityAnnouncer {
  readonly context: Ref<PluginContextEvent | null>;
  readonly announce: () => void;
  readonly stop: () => void;
}

export const useActivityAnnouncer = ({
  client,
  state,
  visibility,
}: ActivityAnnouncerSources): ActivityAnnouncer => {
  const context = ref<PluginContextEvent | null>(null);

  const announce = (): void => {
    const claim = activityClaim({
      context: context.value,
      isForeground: visibility.value === 'visible',
      canServerReadForegroundFlag: state.value.foregroundFlag,
    });
    if (claim !== null) client.notifyActivity(claim);
  };

  const wakeAndAnnounce = (): void => {
    client.wake();
    announce();
  };

  const stop = onSandboxContext(event => {
    context.value = event;
    wakeAndAnnounce();
  });

  watch(visibility, next => {
    if (next === 'visible') wakeAndAnnounce();
  });

  return { context, announce, stop };
};
