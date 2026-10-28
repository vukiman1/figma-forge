<script setup lang="ts">
import { Check, X } from '@lucide/vue';

import type { ActivityStatus } from '../relay/state.js';

defineProps<{ status: ActivityStatus }>();

const STATUS_COLOR = {
  pending: 'text-warning',
  ok: 'text-success',
  error: 'text-danger',
} satisfies Record<ActivityStatus, string>;
</script>

<template>
  <span
    class="grid size-3 shrink-0 place-items-center"
    :class="[STATUS_COLOR[status], status === 'pending' ? 'animate-breathe' : '']"
  >
    <Check v-if="status === 'ok'" class="size-3" />
    <X v-else-if="status === 'error'" class="size-3" />
    <span v-else class="size-1.5 rounded-full bg-current" />
  </span>
</template>
