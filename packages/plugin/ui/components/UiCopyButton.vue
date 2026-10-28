<script setup lang="ts">
import { useCopyToClipboard } from '../composables/useCopyToClipboard.js';

const props = defineProps<{
  label: string;
  value: string | (() => string);
  disabled?: boolean;
  compact?: boolean;
}>();

const { copy, copied } = useCopyToClipboard();

const onClick = (): void => {
  void copy(typeof props.value === 'function' ? props.value() : props.value);
};
</script>

<template>
  <button
    class="shrink-0 border border-line transition-colors duration-150 hover:border-line-strong hover:bg-hover disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-transparent"
    :class="[
      compact ? 'rounded px-1.5 py-0.5 text-meta' : 'rounded-md px-2 py-1',
      copied ? 'text-success' : 'text-dim',
    ]"
    :disabled="disabled"
    @click.stop="onClick"
  >
    {{ copied ? 'Copied' : label }}
  </button>
</template>
