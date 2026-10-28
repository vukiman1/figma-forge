import { vi } from 'vitest';

import type { SandboxHandlers } from '../../../src/dispatcher.js';
import { createCreateComponentHandler } from '../../../src/features/components/create-component.handler.js';
import { createCreateFrameHandler } from '../../../src/features/nodes/create-frame.handler.js';
import { createDeleteNodesHandler } from '../../../src/features/nodes/delete-nodes.handler.js';
import { createMoveNodesHandler } from '../../../src/features/nodes/move-nodes.handler.js';
import { createRenameNodeHandler } from '../../../src/features/nodes/rename-node.handler.js';
import { createReparentNodesHandler } from '../../../src/features/nodes/reparent-nodes.handler.js';
import { createSetPositionHandler } from '../../../src/features/nodes/set-position.handler.js';
import { createSetCornerRadiusHandler } from '../../../src/features/paint/set-corner-radius.handler.js';
import { createSetFillsHandler } from '../../../src/features/paint/set-fills.handler.js';
import { createSetOpacityHandler } from '../../../src/features/paint/set-opacity.handler.js';
import { createSetStrokesHandler } from '../../../src/features/paint/set-strokes.handler.js';
import { createSetTextPropertiesHandler } from '../../../src/features/text/set-text-properties.handler.js';

export const MIXED = Symbol('mixed');

export const makeFigma = (initial: Record<string, Record<string, unknown>>) => {
  const store = new Map<string, Record<string, unknown>>(Object.entries(initial));
  let seq = 100;
  const currentPage = { appendChild: vi.fn<(n: unknown) => void>() };
  const loadFontAsync = vi.fn<(font: unknown) => Promise<void>>(async () => {});
  const figmaCtx = {
    mixed: MIXED,
    root: { children: [] },
    currentPage,
    loadFontAsync,
    variables: { getVariableByIdAsync: async (id: string) => ({ id }) },
    getNodeByIdAsync: async (id: string) => store.get(id) ?? null,
    createFrame: () => {
      const id = `9:${(seq += 1)}`;
      const node: Record<string, unknown> = {
        id,
        name: 'Frame',
        type: 'FRAME',
        x: 0,
        y: 0,
        resize: vi.fn<(w: number, h: number) => void>(),
        remove: vi.fn<() => void>(() => {
          store.delete(id);
        }),
      };
      store.set(id, node);
      return node;
    },
  } as unknown as typeof figma;
  return { figmaCtx, store, loadFontAsync };
};

export const realWrites = (figmaCtx: typeof figma): SandboxHandlers => ({
  rename_node: createRenameNodeHandler(figmaCtx),
  set_opacity: createSetOpacityHandler(figmaCtx),
  set_fills: createSetFillsHandler(figmaCtx),
  set_strokes: createSetStrokesHandler(figmaCtx),
  set_corner_radius: createSetCornerRadiusHandler(figmaCtx),
  set_text_properties: createSetTextPropertiesHandler(figmaCtx),
  move_nodes: createMoveNodesHandler(figmaCtx),
  set_position: createSetPositionHandler(figmaCtx),
  reparent_nodes: createReparentNodesHandler(figmaCtx),
  create_frame: createCreateFrameHandler(figmaCtx),
  create_component: createCreateComponentHandler(figmaCtx),
  delete_nodes: createDeleteNodesHandler(figmaCtx),
});

export const SOLID = (r: number): unknown => ({ type: 'SOLID', color: { r, g: 0, b: 0 } });
export const INTER_BOLD = { family: 'Inter', style: 'Bold' };
export const FAIL = {
  tool: 'set_fills',
  params: { nodeId: 'F', fills: [{ type: 'GRADIENT_LINEAR' }] },
};
