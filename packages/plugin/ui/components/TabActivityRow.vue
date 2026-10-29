<script setup lang="ts">
import { ChevronRight, Crosshair } from '@lucide/vue';
import { computed, ref } from 'vue';

import { useSharedNow } from '../composables/useSharedNow.js';
import { durationTone, formatDuration, isEntryExpandable } from '../lib/activity-entry.js';
import { formatClockTime, formatRelativeTime } from '../lib/format.js';
import type { ActivityEntry } from '../relay/state.js';
import { revealOnCanvas } from '../sandbox/commands.js';
import TabActivityDetail from './TabActivityDetail.vue';
import TabActivityStatus from './TabActivityStatus.vue';

const props = defineProps<{ entry: ActivityEntry }>();

const now = useSharedNow();

const isExpanded = ref(false);
const isExpandable = computed(() => isEntryExpandable(props.entry));
const isRevealable = computed(() => (props.entry.nodeIds?.length ?? 0) > 0);

const toggle = (): void => {
  if (isExpandable.value) isExpanded.value = !isExpanded.value;
};
const reveal = (): void => revealOnCanvas(props.entry.nodeIds ?? []);
</script>

<template>
  <li>
    <div
      class="group flex w-full items-center gap-2 rounded-md px-1.5 py-1 transition-colors duration-150"
      :class="isExpandable ? 'hover:bg-hover' : ''"
      @click="toggle"
    >
      <component
        :is="isExpandable ? 'button' : 'div'"
        class="flex min-w-0 flex-1 items-center gap-2 text-left"
        :aria-expanded="isExpandable ? isExpanded : undefined"
      >
        <TabActivityStatus :status="entry.status" />
        <span
          class="min-w-0 flex-1 truncate font-medium"
          :class="entry.status === 'error' ? 'text-danger' : 'text-fg'"
        >
          {{ entry.method }}
        </span>
        <span class="shrink-0 text-meta tabular-nums" :class="durationTone(entry.durationMs)">
          {{ formatDuration(entry.durationMs) }}
        </span>
        <span
          class="w-7 shrink-0 text-right text-meta text-faint tabular-nums"
          :title="formatClockTime(entry.startedAt)"
        >
          {{ formatRelativeTime(entry.startedAt, now.getTime()) }}
        </span>
      </component>

      <span class="grid size-3 shrink-0 place-items-center">
        <button
          v-if="isRevealable"
          class="text-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-fg focus-visible:opacity-100"
          :aria-label="`Reveal the nodes ${entry.method} touched`"
          title="Select and zoom to the nodes this call touched"
          @click.stop="reveal"
        >
          <Crosshair class="size-3" />
        </button>
      </span>

      <span class="grid size-3 shrink-0 place-items-center text-faint">
        <ChevronRight
          v-if="isExpandable"
          class="size-3 transition-transform duration-200 ease-standard"
          :class="isExpanded ? 'rotate-90' : ''"
        />
      </span>
    </div>

    <TabActivityDetail v-if="isExpandable" :entry="entry" :is-expanded="isExpanded" />
  </li>
</template>
