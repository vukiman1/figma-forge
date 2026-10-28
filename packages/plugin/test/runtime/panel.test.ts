import { describe, expect, it, vi } from 'vitest';

import {
  createPanelHide,
  createPanelResize,
  createPanelReveal,
  PANEL_DEFAULT_SIZE,
  PANEL_MIN_SIZE,
} from '../../protocol/panel-control.js';
import { createPanelController, STORED_SIZE_KEY } from '../../src/runtime/panel.js';

interface FakeNode {
  id: string;
  type: string;
  removed: boolean;
  parent: FakeNode | null;
}

const fakeFigma = (opts: { stored?: unknown; nodes?: FakeNode[]; mode?: string } = {}) => {
  const storage = new Map<string, unknown>();
  if (opts.stored !== undefined) storage.set(STORED_SIZE_KEY, opts.stored);
  const byId = new Map((opts.nodes ?? []).map(n => [n.id, n]));
  const page: FakeNode = { id: 'p1', type: 'PAGE', removed: false, parent: null };

  return {
    mode: opts.mode ?? 'default',
    showUI: vi.fn<(html: string, options: unknown) => void>(),
    notify: vi.fn<(message: string) => void>(),
    on: vi.fn<(event: string, fn: () => void) => void>(),
    ui: {
      resize: vi.fn<(w: number, h: number) => void>(),
      hide: vi.fn<() => void>(),
      show: vi.fn<() => void>(),
    },
    clientStorage: {
      getAsync: vi.fn<(key: string) => Promise<unknown>>(async key =>
        Promise.resolve(storage.get(key)),
      ),
      setAsync: vi.fn<(key: string, value: unknown) => Promise<void>>(async (key, value) => {
        storage.set(key, value);
        return Promise.resolve();
      }),
    },
    getNodeByIdAsync: vi.fn<(id: string) => Promise<FakeNode | null>>(async id =>
      Promise.resolve(byId.get(id) ?? null),
    ),
    setCurrentPageAsync: vi.fn<(p: FakeNode) => Promise<void>>(async () => Promise.resolve()),
    currentPage: { id: page.id, selection: [] as FakeNode[] },
    viewport: { zoom: 1, scrollAndZoomIntoView: vi.fn<(n: FakeNode[]) => void>() },
    page,
  };
};

type Fake = ReturnType<typeof fakeFigma>;

const controllerFor = (f: Fake) => createPanelController(f as unknown as typeof figma);

const settle = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

describe('createPanelController', () => {
  describe('open', () => {
    it('shows the UI at the default size, following Figma’s theme', () => {
      const f = fakeFigma();

      controllerFor(f).open('<html></html>');

      expect(f.showUI).toHaveBeenCalledWith('<html></html>', {
        ...PANEL_DEFAULT_SIZE,
        themeColors: true,
      });
    });

    it('does not manage a window that Dev Mode’s Inspect panel owns', async () => {
      const f = fakeFigma({ stored: { width: 420, height: 560 }, mode: 'inspect' });

      controllerFor(f).open('<html></html>');
      await settle();

      expect(f.showUI).toHaveBeenCalled();
      expect(f.ui.resize).not.toHaveBeenCalled();
      expect(f.on).not.toHaveBeenCalled();
    });

    it('snaps to the stored size once storage answers', async () => {
      const f = fakeFigma({ stored: { width: 420, height: 560 } });

      controllerFor(f).open('<html></html>');
      await settle();

      expect(f.ui.resize).toHaveBeenCalledWith(420, 560);
    });

    it('clamps a stored size that predates the current floor', async () => {
      const f = fakeFigma({ stored: { width: 100, height: 100 } });

      controllerFor(f).open('<html></html>');
      await settle();

      expect(f.ui.resize).toHaveBeenCalledWith(PANEL_MIN_SIZE.width, PANEL_MIN_SIZE.height);
    });

    it('keeps the default when nothing is stored or the value is unusable', async () => {
      for (const stored of [undefined, null, 'nonsense', { width: '420' }, {}]) {
        const f = fakeFigma(stored === undefined ? {} : { stored });

        controllerFor(f).open('<html></html>');
        await settle();

        expect(f.ui.resize).not.toHaveBeenCalled();
      }
    });

    it('survives storage throwing', async () => {
      const f = fakeFigma();
      f.clientStorage.getAsync.mockRejectedValueOnce(new Error('storage unavailable'));

      controllerFor(f).open('<html></html>');
      await settle();

      expect(f.ui.resize).not.toHaveBeenCalled();
    });

    it('re-reveals the panel when the plugin is run again', () => {
      const f = fakeFigma();

      controllerFor(f).open('<html></html>');
      const [event, handler] = f.on.mock.calls[0] ?? [];
      handler?.();

      expect(event).toBe('run');
      expect(f.ui.show).toHaveBeenCalled();
    });
  });

  describe('panel-hide', () => {
    it('hides the iframe rather than closing the plugin, which would drop the relay socket', () => {
      const f = fakeFigma();

      controllerFor(f).apply(createPanelHide());

      expect(f.ui.hide).toHaveBeenCalled();
    });
  });

  describe('panel-resize', () => {
    it('applies the requested size', () => {
      const f = fakeFigma();

      controllerFor(f).apply(createPanelResize({ width: 400, height: 500 }, false));

      expect(f.ui.resize).toHaveBeenCalledWith(400, 500);
    });

    it('clamps a size below the floor', () => {
      const f = fakeFigma();

      controllerFor(f).apply(createPanelResize({ width: 10, height: 10 }, false));

      expect(f.ui.resize).toHaveBeenCalledWith(PANEL_MIN_SIZE.width, PANEL_MIN_SIZE.height);
    });

    it('stores the size only when asked to persist, which the panel does once on drag release', () => {
      const f = fakeFigma();
      const panel = controllerFor(f);

      panel.apply(createPanelResize({ width: 400, height: 500 }, false));
      expect(f.clientStorage.setAsync).not.toHaveBeenCalled();

      panel.apply(createPanelResize({ width: 410, height: 510 }, true));
      expect(f.clientStorage.setAsync).toHaveBeenCalledWith(STORED_SIZE_KEY, {
        width: 410,
        height: 510,
      });
    });

    it('stores the clamped size, not the one that was asked for', () => {
      const f = fakeFigma();

      controllerFor(f).apply(createPanelResize({ width: 10, height: 10 }, true));

      expect(f.clientStorage.setAsync).toHaveBeenCalledWith(STORED_SIZE_KEY, PANEL_MIN_SIZE);
    });

    it('survives storage rejecting', () => {
      const f = fakeFigma();
      f.clientStorage.setAsync.mockRejectedValueOnce(new Error('quota'));

      expect(() =>
        controllerFor(f).apply(createPanelResize({ width: 400, height: 500 }, true)),
      ).not.toThrow();
    });
  });

  describe('panel-reveal', () => {
    const sceneNode = (id: string, parent: FakeNode): FakeNode => ({
      id,
      type: 'FRAME',
      removed: false,
      parent,
    });

    it('selects and frames the nodes, saying nothing on success', async () => {
      const f = fakeFigma();
      f.getNodeByIdAsync.mockResolvedValueOnce(sceneNode('1:1', f.page));

      controllerFor(f).apply(createPanelReveal(['1:1']));
      await settle();

      expect(f.viewport.scrollAndZoomIntoView).toHaveBeenCalled();
      expect(f.notify).not.toHaveBeenCalled();
    });

    it('says so when nothing could be found', async () => {
      const f = fakeFigma();

      controllerFor(f).apply(createPanelReveal(['1:1']));
      await settle();

      expect(f.notify).toHaveBeenCalledWith(expect.stringContaining('no longer in this file'));
    });
  });
});
