import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PanelBackgroundButton from '../../ui/components/PanelBackgroundButton.vue';

const runInBackground = vi.hoisted(() => vi.fn<() => void>());
vi.mock('../../ui/composables/usePanelWindow.js', () => ({
  usePanelWindow: () => ({
    runInBackground,
    onResizeStart: vi.fn<() => void>(),
  }),
}));

describe('PanelBackgroundButton', () => {
  beforeEach(() => {
    runInBackground.mockClear();
  });

  it('asks the sandbox to hide the panel, keeping the relay connected', async () => {
    await mount(PanelBackgroundButton).find('button').trigger('click');

    expect(runInBackground).toHaveBeenCalled();
  });

  it('carries its meaning in the accessible name and tooltip, having no room for a label', () => {
    const button = mount(PanelBackgroundButton).find('button');

    expect(button.text()).toBe('');
    expect(button.attributes('aria-label')).toBe('Run in background');
    expect(button.attributes('title')).toContain('relay stays connected');
  });
});
