<script setup lang="ts">
import { Minimize2 } from '@lucide/vue';

import { usePanelWindow } from '../composables/usePanelWindow.js';

const { runInBackground } = usePanelWindow();
</script>

<template>
  <button
    class="-my-1 shrink-0 rounded p-1 text-faint transition-colors duration-150 hover:bg-hover hover:text-fg"
    title="Run in background — hides the panel; the relay stays connected. Reopen by running the plugin again."
    aria-label="Run in background"
    @click="runInBackground"
  >
    <Minimize2 class="size-3" />
  </button>
</template>
