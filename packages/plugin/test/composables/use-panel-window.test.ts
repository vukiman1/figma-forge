import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createPanelHide,
  createPanelResize,
  PANEL_MIN_SIZE,
  type PanelSize,
} from '../../protocol/panel-control.js';
import { usePanelWindow } from '../../ui/composables/usePanelWindow.js';
import { GRIP_OFFSET } from '../../ui/sandbox/commands.js';

const postMessage = vi.fn<(message: unknown, targetOrigin: string) => void>();

let grip: HTMLElement;
let mark: SVGElement;

const press = (clientX: number, clientY: number): void => {
  mark.dispatchEvent(
    new PointerEvent('pointerdown', { clientX, clientY, pointerId: 1, buttons: 1, bubbles: true }),
  );
};

const move = (clientX: number, clientY: number, buttons = 1): void => {
  window.dispatchEvent(
    new PointerEvent('pointermove', { clientX, clientY, pointerId: 1, buttons }),
  );
};

const release = (clientX: number, clientY: number, type = 'pointerup'): void => {
  window.dispatchEvent(new PointerEvent(type, { clientX, clientY, pointerId: 1, buttons: 0 }));
};

const sentMessages = (): unknown[] =>
  postMessage.mock.calls.map(
    ([envelope]) => (envelope as { pluginMessage: unknown }).pluginMessage,
  );

const persisted = (): unknown[] =>
  sentMessages().filter(m => (m as { persist?: boolean }).persist === true);

const size = (clientX: number, clientY: number): PanelSize => ({
  width: clientX + GRIP_OFFSET,
  height: clientY + GRIP_OFFSET,
});

const startDrag = (clientX = 500, clientY = 600): void => {
  const { onResizeStart } = usePanelWindow();
  grip.addEventListener('pointerdown', onResizeStart);
  press(clientX, clientY);
};

beforeEach(() => {
  postMessage.mockClear();
  vi.stubGlobal('parent', { postMessage });
  grip = document.createElement('div');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  mark = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  svg.append(mark);
  grip.append(svg);
  document.body.append(grip);
});

afterEach(() => {
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, buttons: 0 }));
  grip.remove();
  vi.unstubAllGlobals();
});

describe('usePanelWindow', () => {
  it('asks the sandbox to hide the panel rather than close the plugin, which would drop the relay socket', () => {
    usePanelWindow().runInBackground();

    expect(sentMessages()).toEqual([createPanelHide()]);
  });

  describe('drag-to-resize', () => {
    it('ignores pointer movement that is not part of a drag', () => {
      usePanelWindow();

      move(500, 600);

      expect(postMessage).not.toHaveBeenCalled();
    });

    it('captures the pointer on the grip that owns the handler, not the svg path under the pointer', () => {
      const onGrip = vi.spyOn(grip, 'setPointerCapture').mockImplementation(() => {});
      const onMark = vi.spyOn(mark, 'setPointerCapture').mockImplementation(() => {});
      startDrag();

      expect(onGrip).toHaveBeenCalledWith(1);
      expect(onMark).not.toHaveBeenCalled();
    });

    it('streams sizes without persisting while dragging', () => {
      startDrag(500, 600);
      move(520, 620);

      expect(sentMessages()).toEqual([createPanelResize(size(520, 620), false)]);
    });

    it('persists exactly once, on release', () => {
      startDrag(500, 600);
      move(510, 610);
      move(520, 620);
      release(530, 630);

      expect(persisted()).toEqual([createPanelResize(size(530, 630), true)]);
    });

    it('keeps tracking on window after the pointer has left the 16px grip', () => {
      startDrag(500, 600);
      move(900, 900);
      move(1200, 1200);

      expect(sentMessages()).toEqual([
        createPanelResize(size(900, 900), false),
        createPanelResize(size(1200, 1200), false),
      ]);
    });

    it('drags on when setPointerCapture throws, since capture only widens the window listeners', () => {
      vi.spyOn(grip, 'setPointerCapture').mockImplementation(() => {
        throw new Error('NotFoundError');
      });

      startDrag(500, 600);
      move(900, 900);
      release(950, 950);

      expect(persisted()).toEqual([createPanelResize(size(950, 950), true)]);
    });

    it('releases the capture it took', () => {
      vi.spyOn(grip, 'setPointerCapture').mockImplementation(() => {});
      const releaseCapture = vi.spyOn(grip, 'releasePointerCapture').mockImplementation(() => {});

      startDrag();
      release(700, 700);

      expect(releaseCapture).toHaveBeenCalledWith(1);
    });

    it('does not try to release a capture it never took', () => {
      vi.spyOn(grip, 'setPointerCapture').mockImplementation(() => {
        throw new Error('NotFoundError');
      });
      const releaseCapture = vi.spyOn(grip, 'releasePointerCapture').mockImplementation(() => {});

      startDrag();
      release(700, 700);

      expect(releaseCapture).not.toHaveBeenCalled();
    });

    it('survives a release that throws because the browser already released', () => {
      vi.spyOn(grip, 'setPointerCapture').mockImplementation(() => {});
      vi.spyOn(grip, 'releasePointerCapture').mockImplementation(() => {
        throw new Error('NotFoundError');
      });

      startDrag(500, 600);
      move(700, 700);
      expect(() => release(700, 700)).not.toThrow();
      expect(persisted()).toEqual([createPanelResize(size(700, 700), true)]);
    });

    it('stops tracking after release', () => {
      startDrag(500, 600);
      release(500, 600);
      postMessage.mockClear();

      move(700, 800);

      expect(postMessage).not.toHaveBeenCalled();
    });

    it('does not emit a stray persist when release arrives without a drag', () => {
      usePanelWindow();

      release(500, 600);

      expect(postMessage).not.toHaveBeenCalled();
    });

    it('holds the floor while the pointer keeps moving past it', () => {
      startDrag(500, 600);
      move(10, 10);

      expect(sentMessages()).toEqual([
        createPanelResize({ width: PANEL_MIN_SIZE.width, height: PANEL_MIN_SIZE.height }, false),
      ]);
    });

    it('ends the drag on a buttonless move, a release that happened outside the iframe, keeping the last dragged size', () => {
      startDrag(500, 600);
      move(700, 700);
      postMessage.mockClear();

      move(900, 900, 0);
      move(1100, 1100);

      expect(sentMessages()).toEqual([createPanelResize(size(700, 700), true)]);
    });

    it('keeps the size the drag reached when the gesture is cancelled, not the cancel coordinates', () => {
      startDrag(500, 600);
      move(700, 700);
      release(20, 20, 'pointercancel');

      expect(persisted()).toEqual([createPanelResize(size(700, 700), true)]);
    });

    it('stores nothing for a click on the grip, so the press offset never nudges the window', () => {
      startDrag(500, 600);
      release(500, 600);

      expect(postMessage).not.toHaveBeenCalled();
    });

    it('ignores a second press while a drag is already running, so window listeners are not doubled', () => {
      const { onResizeStart } = usePanelWindow();
      grip.addEventListener('pointerdown', onResizeStart);

      press(500, 600);
      move(700, 700);
      press(500, 600);
      release(800, 800);

      expect(persisted()).toEqual([createPanelResize(size(800, 800), true)]);
    });
  });
});
