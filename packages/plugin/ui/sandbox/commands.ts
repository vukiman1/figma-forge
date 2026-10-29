import {
  clampPanelSize,
  createPanelHide,
  createPanelResize,
  createPanelReveal,
  type PanelSize,
} from '../../protocol/panel-control.js';
import { postToSandbox } from './messaging.js';

export const GRIP_OFFSET = 4;

export const sizeFromPointer = (clientX: number, clientY: number): PanelSize =>
  clampPanelSize(clientX + GRIP_OFFSET, clientY + GRIP_OFFSET);

export const hidePanel = (): void => postToSandbox(createPanelHide());

export const resizePanel = (size: PanelSize, persist: boolean): void =>
  postToSandbox(createPanelResize(size, persist));

export const revealOnCanvas = (nodeIds: readonly string[]): void => {
  if (nodeIds.length === 0) return;
  postToSandbox(createPanelReveal(nodeIds));
};
