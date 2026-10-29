import './runtime/shims.js';
import { createPluginContextEvent, SELECTION_DETAIL_LIMIT } from '../protocol/bridge.js';
import { parsePanelControl } from '../protocol/panel-control.js';
import { createSandboxHandlers } from './features/sandbox-handlers.js';
import { resumeHostYield } from './runtime/cooperative.js';
import { dispatchSandboxMessage } from './runtime/dispatcher.js';
import { createPanelController } from './runtime/panel.js';

const DEFAULT_MODE = 'default';

const log = (message: string): void => console.log(message);

const panel = createPanelController(figma);
panel.open(__html__);

const selectionDetail = (
  node: SceneNode,
): { id: string; name: string; type: string; width: number; height: number } => ({
  id: node.id,
  name: node.name,
  type: node.type,
  width: 'width' in node ? Math.round(node.width) : 0,
  height: 'height' in node ? Math.round(node.height) : 0,
});

const postToPanel = (message: unknown): void => {
  // oxlint-disable-next-line unicorn/require-post-message-target-origin -- figma.ui.postMessage takes no target origin
  figma.ui.postMessage(message);
};

const emitContext = (): void => {
  const page = figma.currentPage;
  postToPanel(
    createPluginContextEvent({
      fileName: figma.root.name,
      pageId: page.id,
      pageName: page.name,
      selectionCount: page.selection.length,
      selection: page.selection.slice(0, SELECTION_DETAIL_LIMIT).map(selectionDetail),
      editorType: figma.editorType,
      mode: figma.mode ?? DEFAULT_MODE,
      apiVersion: figma.apiVersion,
    }),
  );
};

const handlers = createSandboxHandlers(figma);

const dispatchToolCall = async (raw: unknown): Promise<void> => {
  const outcome = await dispatchSandboxMessage({
    raw,
    handlers,
    editorType: figma.editorType,
    log,
  });
  if (outcome.kind === 'reply') postToPanel(outcome.reply);
};

figma.ui.onmessage = (raw: unknown): void => {
  if (resumeHostYield(raw)) return;
  const control = parsePanelControl(raw);
  if (control !== null) {
    panel.apply(control);
    return;
  }
  void dispatchToolCall(raw);
};

emitContext();
figma.on('currentpagechange', emitContext);
figma.on('selectionchange', emitContext);
