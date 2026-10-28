<script setup lang="ts">
import { formatClockTime } from '../lib/format.js';
import type { ActivityEntry } from '../relay/state.js';
import UiPayloadBlock from './UiPayloadBlock.vue';
import UiSectionHeading from './UiSectionHeading.vue';

defineProps<{ entry: ActivityEntry; isExpanded: boolean }>();
</script>

<template>
  <div
    class="grid transition-[grid-template-rows] duration-240 ease-out-expo"
    :class="isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
  >
    <div class="overflow-hidden">
      <div class="mt-1 mb-2 ml-3.5 space-y-2.5 border-l border-line pl-2.5">
        <p class="font-mono text-meta text-faint">Started {{ formatClockTime(entry.startedAt) }}</p>

        <div v-if="entry.error">
          <UiSectionHeading class="mb-1">Error</UiSectionHeading>
          <p
            class="max-h-40 overflow-auto rounded-md bg-raised p-2 font-mono text-meta leading-snug wrap-break-word text-danger"
          >
            {{ entry.error }}
          </p>
        </div>

        <UiPayloadBlock
          v-if="entry.request"
          label="Request"
          :preview="entry.request.preview"
          max-height="max-h-40"
        />
        <UiPayloadBlock
          v-if="entry.payload"
          label="Payload → LLM"
          :preview="entry.payload.preview"
          :bytes="entry.payload.bytes"
          :truncated="entry.payload.truncated"
        />
      </div>
    </div>
  </div>
</template>
