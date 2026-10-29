<script setup lang="ts">
import { usePanelWindow } from '../composables/usePanelWindow.js';

const { onResizeStart } = usePanelWindow();
</script>

<template>
  <div
    class="absolute right-0 bottom-0 size-4 cursor-nwse-resize touch-none text-faint transition-colors duration-150 hover:text-fg"
    title="Drag to resize"
    @pointerdown="onResizeStart"
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      class="size-4"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
    >
      <path d="M12 3 L3 12" />
      <path d="M12 8 L8 12" />
    </svg>
  </div>
</template>
