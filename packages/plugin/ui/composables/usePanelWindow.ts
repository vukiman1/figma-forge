import type { PanelSize } from '../../protocol/panel-control.js';
import { capturePointer } from '../lib/pointer-capture.js';
import { hidePanel, resizePanel, sizeFromPointer } from '../sandbox/commands.js';

export interface PanelWindow {
  readonly runInBackground: () => void;
  readonly onResizeStart: (event: PointerEvent) => void;
}

const startResizeDrag = (event: PointerEvent, onFinish: () => void): void => {
  let lastSize: PanelSize | null = null;
  const releaseCapture = capturePointer(event);

  const finish = (): void => {
    onFinish();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', finish);
    releaseCapture();
    if (lastSize !== null) resizePanel(lastSize, true);
  };

  const onMove = (move: PointerEvent): void => {
    if (move.buttons === 0) {
      finish();
      return;
    }
    lastSize = sizeFromPointer(move.clientX, move.clientY);
    resizePanel(lastSize, false);
  };

  const onUp = (up: PointerEvent): void => {
    if (lastSize !== null) lastSize = sizeFromPointer(up.clientX, up.clientY);
    finish();
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', finish);
};

export const usePanelWindow = (): PanelWindow => {
  let isDragging = false;
  return {
    runInBackground: hidePanel,
    onResizeStart: (event: PointerEvent): void => {
      if (isDragging) return;
      isDragging = true;
      startResizeDrag(event, () => {
        isDragging = false;
      });
    },
  };
};
