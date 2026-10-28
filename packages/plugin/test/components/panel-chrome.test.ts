import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import { createPluginContextEvent, type PluginContextEvent } from '../../protocol/bridge.js';
import App from '../../ui/App.vue';
import type { RelayClientState } from '../../ui/relay/state.js';

const contextRef = ref<PluginContextEvent | null>(null);

const state: RelayClientState = {
  status: 'connected',
  port: 3055,
  sessionResumed: false,
  serverVersion: '0.3.0',
  lastError: null,
  versionNotice: null,
  foregroundFlag: true,
  connectedAt: Date.now(),
  reconnectCount: 0,
  totalCalls: 0,
  failedCalls: 0,
  activity: [],
};

vi.mock('../../ui/composables/useRelaySession.js', () => ({
  useRelaySession: () => ({
    state: ref(state),
    context: contextRef,
    busy: ref(false),
    sessionId: 'sess-1',
    buildDiagnostics: (): string => '{}',
  }),
}));

const context = (mode: string): PluginContextEvent =>
  createPluginContextEvent({
    fileName: 'Design File',
    pageId: 'p1',
    pageName: 'Page 1',
    selectionCount: 0,
    selection: [],
    editorType: mode === 'inspect' ? 'dev' : 'figma',
    mode,
    apiVersion: '1.0.0',
  });

const grip = (wrapper: ReturnType<typeof mount>) => wrapper.find('[title="Drag to resize"]');
const backgroundButton = (wrapper: ReturnType<typeof mount>) =>
  wrapper.find('[aria-label="Run in background"]');

describe('App window chrome', () => {
  it('draws the grip and background button in a floating plugin window', () => {
    contextRef.value = context('default');

    const wrapper = mount(App);

    expect(grip(wrapper).exists()).toBe(true);
    expect(backgroundButton(wrapper).exists()).toBe(true);
  });

  it('withdraws both in Dev Mode’s Inspect panel, where resize is inert and hiding strands the plugin', () => {
    contextRef.value = context('inspect');

    const wrapper = mount(App);

    expect(grip(wrapper).exists()).toBe(false);
    expect(backgroundButton(wrapper).exists()).toBe(false);
  });

  it('states an out-of-date plugin in the header as a warning, since every call still runs', () => {
    contextRef.value = context('default');
    state.status = 'connected';
    state.versionNotice = 'Figma Forge plugin v0.3.0 is older than this server (v0.4.0).';

    const wrapper = mount(App);
    const banner = wrapper.find('p.wrap-break-word');

    expect(banner.text()).toContain('older than this server');
    expect(banner.classes()).toContain('text-warning');
    state.versionNotice = null;
  });

  it('states a refusal in the header as an error, read off a connection that never came up', () => {
    contextRef.value = context('default');
    state.status = 'disconnected';
    state.versionNotice = 'protocol mismatch: server speaks 0.1.0, plugin speaks 9.9.9';

    const wrapper = mount(App);
    const banner = wrapper.find('p.wrap-break-word');

    expect(banner.classes()).toContain('text-danger');
    state.versionNotice = null;
    state.status = 'connected';
  });

  it('pads the scrolled panel rather than the scroller, whose bottom padding Chromium leaves out of the overflow', () => {
    contextRef.value = context('default');

    const scroller = mount(App).find('section.overflow-y-auto');

    expect(scroller.classes()).not.toContain('pb-2');
    expect(scroller.find('.min-h-full').classes()).toContain('pb-2');
  });

  it('shows no banner when there is nothing to say about the version', () => {
    contextRef.value = context('default');

    const wrapper = mount(App);

    expect(wrapper.find('p.wrap-break-word').exists()).toBe(false);
  });

  it('assumes a floating window until the sandbox has said otherwise, so its chrome never flashes in', () => {
    contextRef.value = null;

    const wrapper = mount(App);

    expect(grip(wrapper).exists()).toBe(true);
    expect(backgroundButton(wrapper).exists()).toBe(true);
  });
});
