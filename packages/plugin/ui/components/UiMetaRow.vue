<script setup lang="ts">
defineProps<{
  label: string;
  mono?: boolean;
  truncate?: boolean;
  valueClass?: string;
}>();
</script>

<template>
  <div class="flex items-baseline justify-between gap-3">
    <dt class="shrink-0 text-dim">{{ label }}</dt>
    <dd
      class="text-right"
      :class="[
        truncate ? 'min-w-0 truncate' : '',
        mono ? 'font-mono text-meta tabular-nums' : '',
        valueClass,
      ]"
    >
      <slot />
    </dd>
  </div>
</template>
