import { describe, expect, it, vi } from 'vitest';

import { useCopyToClipboard } from '../../ui/composables/useCopyToClipboard.js';

const useClipboard = vi.hoisted(() => vi.fn<(options: unknown) => unknown>());
vi.mock('@vueuse/core', () => ({ useClipboard }));

describe('useCopyToClipboard', () => {
  it('falls back to execCommand, since the Figma plugin iframe has no async Clipboard API', () => {
    useCopyToClipboard();

    expect(useClipboard).toHaveBeenCalledWith({ legacy: true });
  });
});
