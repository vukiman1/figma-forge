import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';

import UiCopyButton from '../../ui/components/UiCopyButton.vue';
import UiMetaRow from '../../ui/components/UiMetaRow.vue';
import UiSection from '../../ui/components/UiSection.vue';

const clipboard = vi.hoisted(() => ({ copy: vi.fn<(text: string) => void>() }));

vi.mock('@vueuse/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@vueuse/core')>();
  const { ref } = await import('vue');
  return {
    ...actual,
    useClipboard: () => {
      const copied = ref(false);
      return {
        copy: (text: string) => {
          clipboard.copy(text);
          copied.value = true;
        },
        copied,
      };
    },
  };
});

describe('UiMetaRow', () => {
  const mountRow = (props: Record<string, unknown> = {}) =>
    mount(UiMetaRow, { props: { label: 'Session', ...props }, slots: { default: 'abcdefgh' } });

  it('pairs the label with its value', () => {
    const wrapper = mountRow();

    expect(wrapper.find('dt').text()).toBe('Session');
    expect(wrapper.find('dd').text()).toBe('abcdefgh');
  });

  it('cuts a long value off rather than widening the row, when asked', () => {
    expect(mountRow({ truncate: true }).find('dd').classes()).toEqual(
      expect.arrayContaining(['min-w-0', 'truncate']),
    );
  });

  it('leaves values whole by default', () => {
    expect(mountRow().find('dd').classes()).not.toContain('truncate');
  });

  it('renders values as prose by default', () => {
    const classes = mountRow().find('dd').classes();

    expect(classes).not.toContain('font-mono');
    expect(classes).not.toContain('tabular-nums');
  });

  it('renders data values monospaced with tabular figures', () => {
    expect(mountRow({ mono: true }).find('dd').classes()).toEqual(
      expect.arrayContaining(['font-mono', 'tabular-nums', 'text-meta']),
    );
  });

  it('applies caller classes to the value, not to the row', () => {
    const wrapper = mountRow({ valueClass: 'text-danger' });

    expect(wrapper.find('dd').classes()).toContain('text-danger');
    expect(wrapper.classes()).not.toContain('text-danger');
  });
});

describe('UiSection', () => {
  const mountSection = (props: Record<string, unknown> = {}) =>
    mount(UiSection, { props, slots: { default: '<p>body</p>' } });

  it('titles the block and renders its body', () => {
    const wrapper = mountSection({ title: 'Connection' });

    expect(wrapper.text()).toContain('Connection');
    expect(wrapper.text()).toContain('body');
  });

  it('omits the heading when untitled', () => {
    const wrapper = mountSection();

    expect(wrapper.find('p.uppercase').exists()).toBe(false);
    expect(wrapper.text()).toContain('body');
  });

  it('keeps its edges flush so the parent owns the rules between sections', () => {
    expect(mountSection().classes()).toEqual(expect.arrayContaining(['first:pt-0', 'last:pb-0']));
  });
});

describe('UiCopyButton', () => {
  const mountButton = (props: Record<string, unknown> = {}) =>
    mount(UiCopyButton, { props: { label: 'Copy', value: 'copy-me', ...props } });

  beforeEach(() => {
    clipboard.copy.mockClear();
  });

  it('hands its value to the clipboard', async () => {
    await mountButton().trigger('click');

    expect(clipboard.copy).toHaveBeenCalledWith('copy-me');
  });

  it('confirms the copy in the label', async () => {
    const wrapper = mountButton({ label: 'Copy diagnostic bundle' });
    expect(wrapper.text()).toBe('Copy diagnostic bundle');

    await wrapper.trigger('click');

    expect(wrapper.text()).toBe('Copied');
  });

  it('keeps the copied state local to one button', async () => {
    const first = mountButton({ value: 'a' });
    const second = mountButton({ value: 'b' });

    await first.trigger('click');

    expect(first.text()).toBe('Copied');
    expect(second.text()).toBe('Copy');
  });

  describe('a value that is expensive to produce', () => {
    it('is not built until the button is clicked', async () => {
      const build = vi.fn<() => string>(() => 'built');
      const wrapper = mountButton({ value: build });
      expect(build).not.toHaveBeenCalled();

      await wrapper.trigger('click');

      expect(build).toHaveBeenCalledTimes(1);
      expect(clipboard.copy).toHaveBeenCalledWith('built');
    });
  });

  it('does nothing while disabled', async () => {
    const wrapper = mountButton({ disabled: true });

    await wrapper.trigger('click');

    expect(wrapper.attributes('disabled')).toBeDefined();
    expect(clipboard.copy).not.toHaveBeenCalled();
  });

  it('does not let the click bubble to an enclosing toggle', async () => {
    const onClick = vi.fn<() => void>();
    const wrapper = mount({
      setup: () => () => h('div', { onClick }, [h(UiCopyButton, { label: 'Copy', value: 'x' })]),
    });

    await wrapper.find('button').trigger('click');

    expect(onClick).not.toHaveBeenCalled();
  });

  it('offers a tighter geometry for sitting inline in a header row', () => {
    expect(mountButton({ compact: true }).classes()).toContain('px-1.5');
    expect(mountButton().classes()).toContain('px-2');
  });
});
