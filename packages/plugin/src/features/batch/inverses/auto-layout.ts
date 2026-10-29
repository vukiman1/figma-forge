import { SET_AUTO_LAYOUT_TOOL_NAME, setAutoLayoutParams } from '@figma-forge/core';

import { toPlainJson } from '../../motion/node-motion.js';
import { isSceneNode } from '../../nodes/scene-node.js';
import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { liveNode, nodeForOp } from '../live-node.js';
import {
  type BindingSnapshot,
  captureBindings,
  rebind,
  unbindAdded,
} from '../snapshot/bindings.js';
import { captureGeometry, type GeometrySnapshot, restoreGeometry } from '../snapshot/geometry.js';
import { pickFields, readField, writeIfDifferent } from '../snapshot/values.js';
import {
  AUTO_LAYOUT_BINDINGS,
  AUTO_LAYOUT_PROPS,
  GRID_LAYOUT,
  GRID_MODES,
  GRID_PROPS,
  MANUAL_POSITIONING,
  NO_LAYOUT,
} from './auto-layout-fields.js';
import { livePlacements, restoreChildren } from './grid-children.js';
import { finishGrid, type GridValues, restoreGridTracks } from './grid-tracks.js';

interface AutoLayoutState {
  readonly id: string;
  readonly mode: FrameNode['layoutMode'];
  readonly values: Readonly<Record<string, unknown>>;
  readonly grid: GridValues;
  readonly bindings: BindingSnapshot;
  readonly frame: GeometrySnapshot;
  readonly children: readonly GeometrySnapshot[];
}

const captureGrid = (frame: SceneNode): GridValues => ({
  ...Object.fromEntries(GRID_PROPS.map(key => [key, toPlainJson(readField(frame, key))])),
  ...pickFields(frame, GRID_MODES),
});

const captureAutoLayout = async (figmaCtx: typeof figma, id: string): Promise<AutoLayoutState> => {
  const node = await nodeForOp(figmaCtx, id, SET_AUTO_LAYOUT_TOOL_NAME);
  if (!('layoutMode' in node)) {
    throw new Error(`${batchTool(SET_AUTO_LAYOUT_TOOL_NAME)}: node ${id} has no auto layout`);
  }
  return {
    id,
    mode: node.layoutMode,
    values: pickFields(node, AUTO_LAYOUT_PROPS),
    grid: node.layoutMode === GRID_LAYOUT ? captureGrid(node) : {},
    bindings: await captureBindings(figmaCtx, node, AUTO_LAYOUT_BINDINGS),
    frame: captureGeometry(node),
    children: node.children.map(captureGeometry),
  };
};

const restoreLayoutFields = (frame: SceneNode, { mode, values, grid }: AutoLayoutState): void => {
  if (mode !== NO_LAYOUT) writeIfDifferent(frame, 'layoutMode', mode);
  for (const [key, value] of Object.entries(values)) writeIfDifferent(frame, key, value);
  restoreGridTracks(frame, grid);
  if (mode === NO_LAYOUT) writeIfDifferent(frame, 'layoutMode', NO_LAYOUT);
};

const restoreAutoLayout = async (
  figmaCtx: typeof figma,
  state: AutoLayoutState,
): Promise<undefined> => {
  const frame = await liveNode(figmaCtx, state.id);
  if (!isSceneNode(frame)) return undefined;
  unbindAdded(frame, state.bindings);
  restoreLayoutFields(frame, state);
  restoreGeometry(frame, state.frame);
  const children = await livePlacements(figmaCtx, state.children);
  restoreChildren(children);
  finishGrid(frame, state.grid);
  if (state.grid.gridItemsPositioning === MANUAL_POSITIONING) restoreChildren(children);
  rebind(frame, state.bindings);
  return undefined;
};

export const setAutoLayoutInverse: BatchInverse = defineInverse(
  SET_AUTO_LAYOUT_TOOL_NAME,
  setAutoLayoutParams,
  {
    capture: async (figmaCtx, { nodeId }) => captureAutoLayout(figmaCtx, nodeId),
    undo: async (figmaCtx, state) => restoreAutoLayout(figmaCtx, state),
    touches: ({ id }) => [id],
    resizes: ({ id }) => [id],
  },
);
