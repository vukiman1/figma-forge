import { SET_STROKES_TOOL_NAME, setStrokesParams } from '@figma-forge/core';
import type { z } from 'zod';

import { type BatchInverse, defineInverse } from '../inverse.js';
import { liveNode } from '../live-node.js';
import { nodeIdOf, type PropsState, propsSpec, STROKE_WEIGHTS } from './props.js';

type SetStrokesParams = z.output<typeof setStrokesParams>;

interface VertexNetwork {
  readonly id: string;
  readonly value: VectorNetwork;
}

interface StrokesState {
  readonly props: PropsState;
  readonly network: VertexNetwork | null;
}

const STROKE_PROPS = [
  'strokes',
  ...STROKE_WEIGHTS.slice(0, 1),
  'strokeAlign',
  'dashPattern',
  'strokeCap',
  'strokeJoin',
  'strokeMiterLimit',
  ...STROKE_WEIGHTS.slice(1),
] as const;

const STROKE_PROPS_SPEC = propsSpec<SetStrokesParams>(
  SET_STROKES_TOOL_NAME,
  nodeIdOf,
  STROKE_PROPS,
  { bindings: STROKE_WEIGHTS, resizes: true },
);

const hasMixedEnds = (node: BaseNode | null): node is VectorNode =>
  node?.type === 'VECTOR' &&
  (typeof node.strokeCap === 'symbol' || typeof node.strokeJoin === 'symbol');

const captureNetwork = async (
  figmaCtx: typeof figma,
  { nodeId, strokeCap, strokeJoin }: SetStrokesParams,
): Promise<VertexNetwork | null> => {
  if (strokeCap === undefined && strokeJoin === undefined) return null;
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  return hasMixedEnds(node) ? { id: node.id, value: node.vectorNetwork } : null;
};

const restoreNetwork = async (
  figmaCtx: typeof figma,
  network: VertexNetwork | null,
): Promise<void> => {
  if (network === null) return;
  const node = await liveNode(figmaCtx, network.id);
  if (node?.type === 'VECTOR') await node.setVectorNetworkAsync(network.value);
};

export const setStrokesInverse: BatchInverse = defineInverse(
  SET_STROKES_TOOL_NAME,
  setStrokesParams,
  {
    capture: async (figmaCtx, params): Promise<StrokesState> => {
      const props = await STROKE_PROPS_SPEC.capture(figmaCtx, params);
      return { props, network: await captureNetwork(figmaCtx, params) };
    },
    undo: async (figmaCtx, { props, network }, result) => {
      await restoreNetwork(figmaCtx, network);
      return STROKE_PROPS_SPEC.undo(figmaCtx, props, result);
    },
    touches: ({ props }) => [props.id],
    resizes: ({ props }) => [props.id],
  },
);
