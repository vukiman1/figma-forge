import { isEmbeddedInPanel } from '../../protocol/editor-context.js';
import {
  clampPanelSize,
  PANEL_DEFAULT_SIZE,
  type PanelControlMessage,
  type PanelSize,
} from '../../protocol/panel-control.js';
import { revealNodes } from './reveal.js';

export const STORED_SIZE_KEY = 'ui-size';

const NODES_GONE_NOTICE = 'Figma Forge: those nodes are no longer in this file';

export interface PanelController {
  readonly open: (html: string) => void;
  readonly apply: (message: PanelControlMessage) => void;
}

const storedSize = (saved: unknown): PanelSize | null => {
  if (typeof saved !== 'object' || saved === null) return null;
  if (!('width' in saved) || !('height' in saved)) return null;
  const { width, height } = saved;
  return typeof width === 'number' && typeof height === 'number'
    ? clampPanelSize(width, height)
    : null;
};

const restoreStoredSize = async (figmaCtx: typeof figma): Promise<void> => {
  const saved: unknown = await figmaCtx.clientStorage.getAsync(STORED_SIZE_KEY).catch(() => null);
  const size = storedSize(saved);
  if (size !== null) figmaCtx.ui.resize(size.width, size.height);
};

const reveal = async (figmaCtx: typeof figma, nodeIds: readonly string[]): Promise<void> => {
  const { revealed } = await revealNodes(figmaCtx, nodeIds);
  if (revealed === 0) figmaCtx.notify(NODES_GONE_NOTICE);
};

const resize = (
  figmaCtx: typeof figma,
  width: number,
  height: number,
  shouldPersist: boolean,
): void => {
  const size = clampPanelSize(width, height);
  figmaCtx.ui.resize(size.width, size.height);
  if (shouldPersist)
    void figmaCtx.clientStorage.setAsync(STORED_SIZE_KEY, size).catch(() => undefined);
};

const openPanel = (figmaCtx: typeof figma, html: string): void => {
  figmaCtx.showUI(html, { ...PANEL_DEFAULT_SIZE, themeColors: true });
  if (isEmbeddedInPanel(figmaCtx.mode ?? 'default')) return;
  void restoreStoredSize(figmaCtx);
  figmaCtx.on('run', () => figmaCtx.ui.show());
};

const applyControl = (figmaCtx: typeof figma, message: PanelControlMessage): void => {
  switch (message.kind) {
    case 'panel-hide':
      figmaCtx.ui.hide();
      return;
    case 'panel-resize':
      resize(figmaCtx, message.width, message.height, message.persist);
      return;
    case 'panel-reveal':
      void reveal(figmaCtx, message.nodeIds);
  }
};

export const createPanelController = (figmaCtx: typeof figma): PanelController => ({
  open: html => openPanel(figmaCtx, html),
  apply: message => applyControl(figmaCtx, message),
});
