<script setup lang="ts">
defineProps<{ version: string; totalCalls: number; failedCalls: number }>();
</script>

<template>
  <footer
    class="flex shrink-0 items-center gap-1.5 border-t border-line px-3 py-1.5 text-meta text-faint"
  >
    <span class="truncate">v{{ version }}</span>
    <span aria-hidden="true" class="opacity-50">·</span>
    <span class="shrink-0 tabular-nums">{{ totalCalls }} calls</span>
    <template v-if="failedCalls > 0">
      <span aria-hidden="true" class="opacity-50">·</span>
      <span class="shrink-0 text-danger tabular-nums">{{ failedCalls }} failed</span>
    </template>
  </footer>
</template>
