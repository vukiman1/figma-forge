<script setup lang="ts">
import UiSectionHeading from './UiSectionHeading.vue';

defineProps<{
  title?: string;
}>();
</script>

<template>
  <section class="pt-2.5 pb-3.5 first:pt-0 last:pb-0">
    <UiSectionHeading v-if="title !== undefined" class="mb-1.5">{{ title }}</UiSectionHeading>
    <slot />
  </section>
</template>
