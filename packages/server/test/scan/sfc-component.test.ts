import { describe, expect, it } from 'vitest';

import { extractSfcComponent } from '../../src/scan/sfc-component.js';

describe('extractSfcComponent (Vue / Svelte props)', () => {
  it('parses Vue defineProps type form, and marks props as extracted', () => {
    const code =
      '<script setup lang="ts">defineProps<{ size?: string; variant: "a" | "b" }>()</script><template><button/></template>';
    const [c] = extractSfcComponent('ui/Button.vue', code, 'vue');
    expect(c?.name).toBe('Button');
    expect(c?.propNames).toEqual(['size', 'variant']);
    expect(c?.propsExtracted).toBe(true);
  });

  it('parses Vue defineProps object and array forms', () => {
    const obj = extractSfcComponent(
      'C.vue',
      '<script setup>defineProps({ size: String, label: { type: String } })</script>',
      'vue',
    );
    expect(obj[0]?.propNames).toEqual(['size', 'label']);
    const arr = extractSfcComponent(
      'C.vue',
      "<script setup>defineProps(['size', 'tone'])</script>",
      'vue',
    );
    expect(arr[0]?.propNames).toEqual(['size', 'tone']);
  });

  it('handles withDefaults(defineProps<...>()) and reads a script-less template as genuinely prop-less', () => {
    const wd = extractSfcComponent(
      'C.vue',
      '<script setup lang="ts">withDefaults(defineProps<{ open: boolean }>(), { open: false })</script>',
      'vue',
    );
    expect(wd[0]?.propNames).toEqual(['open']);
    const none = extractSfcComponent('C.vue', '<template><div/></template>', 'vue');
    expect(none[0]?.propNames).toEqual([]);
    expect(none[0]?.propsExtracted).toBe(true);
  });

  it('parses Svelte export let and $props() runes', () => {
    const four = extractSfcComponent(
      'C.svelte',
      '<script>export let size; export let tone = "x";</script>',
      'svelte',
    );
    expect(four[0]?.propNames.toSorted()).toEqual(['size', 'tone']);
    const five = extractSfcComponent(
      'C.svelte',
      '<script lang="ts">let { size, tone } = $props();</script>',
      'svelte',
    );
    expect(five[0]?.propNames.toSorted()).toEqual(['size', 'tone']);
  });

  it('marks props NOT extracted when the script fails to parse', () => {
    const [c] = extractSfcComponent('C.vue', '<script setup>const = = =</script>', 'vue');
    expect(c?.propsExtracted).toBe(false);
    expect(c?.propNames).toEqual([]);
  });

  it('distinguishes a script-less template from a script it could not delimit', () => {
    const [template] = extractSfcComponent('C.vue', '<template><button/></template>', 'vue');
    expect(template?.propsExtracted).toBe(true);

    const [unclosed] = extractSfcComponent(
      'C.vue',
      '<script setup lang="ts">defineProps<{ size?: string }>()',
      'vue',
    );
    expect(unclosed?.propsExtracted).toBe(false);
  });

  it.each([
    ['an interface', `interface Props { size?: string }\ndefineProps<Props>()`],
    ['a type alias', `type Props = { size?: string }\ndefineProps<Props>()`],
    [
      'withDefaults',
      `interface Props { size?: string }\nwithDefaults(defineProps<Props>(), { size: 'md' })`,
    ],
    ['an assigned result', `interface Props { size?: string }\nconst props = defineProps<Props>()`],
  ])('resolves defineProps declared with %s', (_label, body) => {
    const [c] = extractSfcComponent('C.vue', `<script setup lang="ts">${body}</script>`, 'vue');
    expect(c?.propNames).toEqual(['size']);
    expect(c?.propsExtracted).toBe(true);
  });

  it('folds inherited interface members into Vue props', () => {
    const code = `<script setup lang="ts">
      interface Base { tone: string }
      interface Props extends Base { size?: string }
      defineProps<Props>()
    </script>`;
    const [c] = extractSfcComponent('C.vue', code, 'vue');
    expect(c?.propNames.toSorted()).toEqual(['size', 'tone']);
  });

  it('counts defineModel() as the prop it declares: modelValue by default, or the given name', () => {
    const [c] = extractSfcComponent(
      'C.vue',
      `<script setup lang="ts">const m = defineModel<string>()\nconst t = defineModel<string>('title')</script>`,
      'vue',
    );
    expect(c?.propNames.toSorted()).toEqual(['modelValue', 'title']);
    expect(c?.propsExtracted).toBe(true);
  });

  it('resolves a type declared in one script block and used in another', () => {
    const code = `<script lang="ts">export interface Props { size?: string }</script>
      <script setup lang="ts">defineProps<Props>()</script>`;
    const [c] = extractSfcComponent('C.vue', code, 'vue');
    expect(c?.propNames).toEqual(['size']);
  });

  it.each([
    ['a type annotation', `interface Props { size?: string }\nlet props: Props = $props();`],
    ['a generic argument', `interface Props { size?: string }\nlet props = $props<Props>();`],
  ])('reads Svelte $props() declared with %s', (_label, body) => {
    const [c] = extractSfcComponent('C.svelte', `<script lang="ts">${body}</script>`, 'svelte');
    expect(c?.propNames).toEqual(['size']);
    expect(c?.propsExtracted).toBe(true);
  });

  it('marks SFC props NOT extracted when the prop type is imported', () => {
    const vue = `<script setup lang="ts">import type { Props } from './types'\ndefineProps<Props>()</script>`;
    const [v] = extractSfcComponent('C.vue', vue, 'vue');
    expect(v?.propsExtracted).toBe(false);
    expect(v?.propNames).toEqual([]);

    const svelte = `<script lang="ts">import type { Props } from './types'\nlet props: Props = $props();</script>`;
    const [s] = extractSfcComponent('C.svelte', svelte, 'svelte');
    expect(s?.propsExtracted).toBe(false);
  });

  it('reads the props of a Vue generic component whose type parameter contains `>`', () => {
    const code =
      '<script setup lang="ts" generic="T extends Record<string, unknown>">\nconst p = defineProps<{ items: T[]; label: string }>()\n</script>';
    const [c] = extractSfcComponent('List.vue', code, 'vue');
    expect(c?.propNames).toEqual(['items', 'label']);
    expect(c?.propsExtracted).toBe(true);
  });

  it.each([
    ['lang="tsx"', '<script setup lang="tsx">const p = defineProps<{ size: string }>()</script>'],
    ['lang="jsx"', `<script setup lang="jsx">const p = defineProps(['size'])</script>`],
    [
      'an unquoted lang=ts',
      '<script setup lang=ts>const p = defineProps<{ size: string }>()</script>',
    ],
  ])('reads the props of a block declaring %s', (_label, code) => {
    const [c] = extractSfcComponent('C.vue', code, 'vue');
    expect(c?.propNames).toEqual(['size']);
    expect(c?.propsExtracted).toBe(true);
  });

  it('does not take props from a commented-out script block', () => {
    const code =
      '<!--\n<script setup lang="ts">const old = defineProps<{ ghost: string }>()</script>\n-->\n<script setup lang="ts">const p = defineProps<{ real: string }>()</script>';
    const [c] = extractSfcComponent('C.vue', code, 'vue');
    expect(c?.propNames).toEqual(['real']);
    expect(c?.propsExtracted).toBe(true);
  });

  it("does not take props from a <script> nested in Vue's <template>", () => {
    const code =
      '<script setup lang="ts">const p = defineProps<{ title: string }>()</script>\n<template><script type="application/ld+json">{"@context":"https://schema.org"}</script></template>';
    const [c] = extractSfcComponent('C.vue', code, 'vue');
    expect(c?.propNames).toEqual(['title']);
    expect(c?.propsExtracted).toBe(true);
  });

  it.each([
    ['a src= block, whose source is another file', '<script src="./C.ts" lang="ts"></script>'],
    ['a lang we have no parser for', '<script lang="coffee">a = 1</script>'],
    ['a file that could not be delimited', '<!-- <script setup lang="ts">defineProps<{ a: 1 }>()'],
  ])('marks props NOT extracted for %s', (_label, code) => {
    const [c] = extractSfcComponent('C.vue', code, 'vue');
    expect(c?.propsExtracted).toBe(false);
  });

  it('keeps the names a partially recovered block yields but stops claiming the list is complete', () => {
    const code =
      '<script setup lang="ts">const p = defineProps<{ size: string }>()</script>\n<script lang="ts">const = = =</script>';
    const [c] = extractSfcComponent('C.vue', code, 'vue');
    expect(c?.propNames).toEqual(['size']);
    expect(c?.propsExtracted).toBe(false);
  });
});
