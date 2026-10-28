import { SET_LAYOUT_PROPS_TOOL_NAME, setLayoutPropsParams } from '@figma-forge/core';

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
import { captureProps, type PropsSnapshot, restoreProps } from '../snapshot/props.js';

interface LayoutPropsState {
  readonly id: string;
  readonly geometry: GeometrySnapshot;
  readonly bindings: BindingSnapshot;
  readonly props: PropsSnapshot;
}

const CLIP_PROPS = ['clipsContent'] as const;
const BOX_BINDINGS = ['minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'width', 'height'] as const;

const captureLayoutProps = async (
  figmaCtx: typeof figma,
  id: string,
): Promise<LayoutPropsState> => {
  const node = await nodeForOp(figmaCtx, id, SET_LAYOUT_PROPS_TOOL_NAME);
  if (!('layoutAlign' in node)) {
    throw new Error(
      `${batchTool(SET_LAYOUT_PROPS_TOOL_NAME)}: node ${id} has no auto-layout child properties`,
    );
  }
  return {
    id,
    geometry: captureGeometry(node),
    props: await captureProps(figmaCtx, node, CLIP_PROPS),
    bindings: await captureBindings(figmaCtx, node, BOX_BINDINGS),
  };
};

const restoreLayoutProps = async (
  figmaCtx: typeof figma,
  { id, geometry, bindings, props }: LayoutPropsState,
): Promise<undefined> => {
  const node = await liveNode(figmaCtx, id);
  if (!isSceneNode(node)) return undefined;
  unbindAdded(node, bindings);
  restoreGeometry(node, geometry);
  await restoreProps(node, props);
  rebind(node, bindings);
  return undefined;
};

export const setLayoutPropsInverse: BatchInverse = defineInverse(
  SET_LAYOUT_PROPS_TOOL_NAME,
  setLayoutPropsParams,
  {
    capture: async (figmaCtx, { nodeId }) => captureLayoutProps(figmaCtx, nodeId),
    undo: async (figmaCtx, state) => restoreLayoutProps(figmaCtx, state),
    touches: ({ id }) => [id],
    resizes: ({ id }) => [id],
  },
);
