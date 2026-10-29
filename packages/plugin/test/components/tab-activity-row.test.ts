import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TabActivityRow from '../../ui/components/TabActivityRow.vue';
import type { ActivityEntry } from '../../ui/relay/state.js';

const reveal = vi.hoisted(() => vi.fn<(ids: readonly string[]) => void>());
vi.mock('../../ui/sandbox/commands.js', () => ({ revealOnCanvas: reveal }));

const payload = (over: Partial<ActivityEntry['payload']> = {}) => ({
  preview: '{"node":"ok"}',
  bytes: 2048,
  truncated: false,
  ...over,
});

const entry = (over: Partial<ActivityEntry> = {}): ActivityEntry => ({
  id: 'req-1',
  method: 'get_design_context',
  startedAt: Date.now(),
  status: 'ok',
  ...over,
});

const mountRow = (over: Partial<ActivityEntry> = {}) =>
  mount(TabActivityRow, { props: { entry: entry(over) } });

const isExpanded = (wrapper: ReturnType<typeof mountRow>): boolean =>
  wrapper.find('.grid-rows-\\[1fr\\]').exists();

const revealButton = (wrapper: ReturnType<typeof mountRow>) =>
  wrapper.find('button:has(.lucide-crosshair)');

describe('TabActivityRow', () => {
  beforeEach(() => {
    reveal.mockClear();
  });

  it('shows the method name', () => {
    expect(mountRow().text()).toContain('get_design_context');
  });

  describe('status', () => {
    it('renders a tick for a successful call', () => {
      const wrapper = mountRow({ status: 'ok' });
      expect(wrapper.html()).toContain('text-success');
      expect(wrapper.find('.lucide-check').exists()).toBe(true);
    });

    it('renders a cross and reddens the method for a failed call', () => {
      const wrapper = mountRow({ status: 'error', error: 'boom' });
      expect(wrapper.html()).toContain('text-danger');
      expect(wrapper.find('.lucide-x').exists()).toBe(true);
    });

    it('shows why a call failed, so an editor-caused failure such as FigJam’s missing styles is explained', async () => {
      const message = 'not a function (editor: figjam — FigJam has no components…)';
      const wrapper = mountRow({ status: 'error', error: message });

      await wrapper.find('button').trigger('click');

      expect(wrapper.text()).toContain('Error');
      expect(wrapper.text()).toContain(message);
    });

    it('opens a failed call that carries nothing but the error, or the reason stays unreachable', () => {
      const wrapper = mountRow({ status: 'error', error: 'boom' });

      expect(wrapper.find('button').exists()).toBe(true);
    });

    it('shows a breathing dot instead of a glyph while pending', () => {
      const wrapper = mountRow({ status: 'pending' });
      expect(wrapper.find('.lucide-check').exists()).toBe(false);
      expect(wrapper.find('.lucide-x').exists()).toBe(false);
      expect(wrapper.html()).toContain('animate-breathe');
    });
  });

  describe('duration', () => {
    it('renders nothing until the call settles', () => {
      expect(mountRow({ status: 'pending' }).text()).not.toContain('ms');
    });

    it('mutes a fast call', () => {
      const wrapper = mountRow({ durationMs: 120 });
      expect(wrapper.text()).toContain('120ms');
      expect(wrapper.html()).toContain('text-faint');
    });

    it('warns on a call slow enough to notice', () => {
      const wrapper = mountRow({ durationMs: 2001 });
      expect(wrapper.html()).toContain('text-warning');
    });

    it('treats the threshold itself as fast', () => {
      const wrapper = mountRow({ durationMs: 2000 });
      expect(wrapper.find('span.text-warning').exists()).toBe(false);
    });
  });

  describe('wall-clock time', () => {
    const startedAt = new Date(2026, 6, 25, 14, 22, 1).getTime();

    it('spells out the wall-clock start time in the expanded detail, for reconciling against a log', () => {
      const wrapper = mountRow({ startedAt, payload: payload() });

      expect(wrapper.text()).toContain('Started 14:22:01');
    });

    it('carries the wall-clock time as a hover title on the relative age', () => {
      const title = mountRow({ startedAt }).find('[title]').attributes('title');

      expect(title).toBe('14:22:01');
    });
  });

  describe('expansion', () => {
    it('is not interactive when there is nothing to show, leaving the chevron column as a spacer', () => {
      const wrapper = mountRow();

      expect(wrapper.find('button').exists()).toBe(false);
      expect(wrapper.find('.lucide-chevron-right').exists()).toBe(false);
    });

    it('renders a button and chevron when a payload exists', () => {
      const wrapper = mountRow({ payload: payload() });
      expect(wrapper.find('button').exists()).toBe(true);
      expect(wrapper.find('.lucide-chevron-right').exists()).toBe(true);
    });

    describe('while the call is still in flight', () => {
      const inFlight = {
        status: 'pending' as const,
        request: payload({ preview: '{"nodeId":"1:2"}' }),
      };

      it('opens on a pending call, since its request params are recorded at dispatch', async () => {
        const wrapper = mountRow(inFlight);
        expect(wrapper.find('button').exists()).toBe(true);

        await wrapper.find('button').trigger('click');

        expect(isExpanded(wrapper)).toBe(true);
        expect(wrapper.text()).toContain('Request');
        expect(wrapper.text()).toContain('nodeId');
      });

      it('shows no result placeholder while in flight, avoiding a second layout shift', async () => {
        const wrapper = mountRow(inFlight);

        await wrapper.find('button').trigger('click');

        expect(wrapper.text()).not.toContain('Payload → LLM');
      });

      it('slides the result in under an open row without collapsing it when the call settles', async () => {
        const wrapper = mountRow(inFlight);
        await wrapper.find('button').trigger('click');
        expect(isExpanded(wrapper)).toBe(true);

        await wrapper.setProps({
          entry: entry({ ...inFlight, status: 'ok', durationMs: 42, payload: payload() }),
        });

        expect(isExpanded(wrapper)).toBe(true);
        expect(wrapper.text()).toContain('Payload → LLM');
        expect(wrapper.text()).toContain('Request');
      });
    });

    it('toggles when a click lands in the gap between the row’s controls', async () => {
      const wrapper = mountRow({ payload: payload() });

      await wrapper.find('li > div').trigger('click');

      expect(isExpanded(wrapper)).toBe(true);
    });

    it('starts collapsed and toggles open and shut on click', async () => {
      const wrapper = mountRow({ payload: payload() });
      expect(isExpanded(wrapper)).toBe(false);

      await wrapper.find('button').trigger('click');
      expect(isExpanded(wrapper)).toBe(true);

      await wrapper.find('button').trigger('click');
      expect(isExpanded(wrapper)).toBe(false);
    });

    it('rotates the chevron while open', async () => {
      const wrapper = mountRow({ payload: payload() });
      expect(wrapper.html()).not.toContain('rotate-90');

      await wrapper.find('button').trigger('click');

      expect(wrapper.html()).toContain('rotate-90');
    });

    it('shows the payload block, with its size', () => {
      const wrapper = mountRow({ payload: payload({ bytes: 2048 }) });

      expect(wrapper.text()).toContain('Payload → LLM');
      expect(wrapper.text()).toContain('2.0 KB');
    });

    it('shows a request block only when the call recorded params', () => {
      expect(mountRow({ payload: payload() }).text()).not.toContain('Request');

      const withRequest = mountRow({
        payload: payload(),
        request: { preview: '{"nodeId":"1:2"}', bytes: 16, truncated: false },
      });

      expect(withRequest.text()).toContain('Request');
      expect(withRequest.text()).toContain('nodeId');
    });

    it('warns when the preview was cut short', () => {
      const wrapper = mountRow({ payload: payload({ truncated: true }) });
      expect(wrapper.text()).toContain('the full result was larger');
    });
  });

  describe('reveal on canvas', () => {
    it('offers a reveal control when the call named a node', () => {
      expect(revealButton(mountRow({ nodeIds: ['1:1'] })).exists()).toBe(true);
    });

    it('names the icon-only reveal control after the call it belongs to', () => {
      const label = revealButton(mountRow({ nodeIds: ['1:1'] })).attributes('aria-label');

      expect(label).toBe('Reveal the nodes get_design_context touched');
    });

    it('offers nothing when the call named no node', () => {
      expect(revealButton(mountRow()).exists()).toBe(false);
      expect(revealButton(mountRow({ nodeIds: [] })).exists()).toBe(false);
    });

    it('hands every id from the entry to the canvas', async () => {
      const wrapper = mountRow({ nodeIds: ['1:1', '2:2'] });

      await revealButton(wrapper).trigger('click');

      expect(reveal).toHaveBeenCalledWith(['1:1', '2:2']);
    });

    it('does not expand the row it sits in', async () => {
      const wrapper = mountRow({ nodeIds: ['1:1'], payload: payload() });

      await revealButton(wrapper).trigger('click');

      expect(isExpanded(wrapper)).toBe(false);
    });

    it('is available on a failed call too', async () => {
      const wrapper = mountRow({ status: 'error', error: 'boom', nodeIds: ['1:1'] });

      await revealButton(wrapper).trigger('click');

      expect(reveal).toHaveBeenCalledWith(['1:1']);
    });
  });
});
