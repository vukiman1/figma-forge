<script setup lang="ts">
import { computed, ref } from 'vue';

import { isEmbeddedInPanel } from '../protocol/editor-context.js';
import BrandMark from './components/BrandMark.vue';
import PanelBackgroundButton from './components/PanelBackgroundButton.vue';
import PanelFooter from './components/PanelFooter.vue';
import PanelGrip from './components/PanelGrip.vue';
import PanelStatus from './components/PanelStatus.vue';
import PanelTabs from './components/PanelTabs.vue';
import TabActivity from './components/TabActivity.vue';
import TabContext from './components/TabContext.vue';
import TabDebug from './components/TabDebug.vue';
import { useRelaySession } from './composables/useRelaySession.js';
import type { Tab } from './lib/tabs.js';

const APP_VERSION = __APP_VERSION__;
const TAB_TRANSITION_MS = { enter: 150, leave: 0 } as const;

const { state, context, busy, sessionId, buildDiagnostics } = useRelaySession(APP_VERSION);

const tab = ref<Tab>('activity');

const isEmbedded = computed(() => context.value !== null && isEmbeddedInPanel(context.value.mode));
</script>

<template>
  <main
    class="relative flex h-full scrollbar-thin scrollbar-thumb-line-strong scrollbar-track-transparent flex-col bg-surface text-panel text-fg"
  >
    <span v-if="busy" class="absolute inset-x-0 top-0 z-10 block h-0.5 overflow-hidden">
      <span class="block h-full w-1/4 animate-sweep bg-brand" />
    </span>

    <header class="relative shrink-0 border-b border-line px-3 pt-2.5 pb-2">
      <div class="flex items-center gap-1.5">
        <BrandMark class="size-3.5 shrink-0" />
        <PanelStatus
          class="min-w-0 flex-1"
          :status="state.status"
          :port="state.port"
          :connected-at="state.connectedAt"
        />
        <PanelBackgroundButton v-if="!isEmbedded" />
      </div>
      <p
        v-if="state.versionNotice !== null"
        class="mt-2 rounded-md bg-raised p-1.5 text-meta wrap-break-word"
        :class="state.status === 'connected' ? 'text-warning' : 'text-danger'"
      >
        {{ state.versionNotice }}
      </p>
      <PanelTabs v-model="tab" class="mt-2.5" />
    </header>

    <section class="flex-1 overflow-x-hidden overflow-y-auto px-2 pt-2">
      <Transition name="tab" mode="out-in" :duration="TAB_TRANSITION_MS">
        <div :key="tab" class="flex min-h-full flex-col pb-2">
          <TabActivity
            v-if="tab === 'activity'"
            :activity="state.activity"
            :connected="state.status === 'connected'"
          />
          <TabContext v-else-if="tab === 'context'" :context="context" />
          <TabDebug
            v-else
            :state="state"
            :session-id="sessionId"
            :plugin-version="APP_VERSION"
            :build-diagnostics="buildDiagnostics"
          />
        </div>
      </Transition>
    </section>

    <PanelFooter
      :version="APP_VERSION"
      :total-calls="state.totalCalls"
      :failed-calls="state.failedCalls"
    />
    <PanelGrip v-if="!isEmbedded" />
  </main>
</template>
