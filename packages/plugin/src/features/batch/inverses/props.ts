import type { z } from 'zod';

import { isTextLike } from '../../text/text-like.js';
import { batchTool, type BatchInverse, defineInverse, type InverseSpec } from '../inverse.js';
import { liveNode, nodeForOp } from '../live-node.js';
import { captureProps, type PropsSnapshot, restoreProps } from '../snapshot/props.js';
import { captureText, type TextSnapshot } from '../snapshot/text-capture.js';
import { restoreText } from '../snapshot/text-restore.js';

export interface PropsState {
  readonly id: string;
  readonly props: PropsSnapshot;
  readonly text: TextSnapshot | null;
}

export interface PropsOptions {
  readonly bindings?: readonly string[];
  readonly resizes?: boolean;
}

export const STROKE_WEIGHTS = [
  'strokeWeight',
  'strokeTopWeight',
  'strokeRightWeight',
  'strokeBottomWeight',
  'strokeLeftWeight',
] as const;

export const CORNERS = [
  'cornerRadius',
  'cornerSmoothing',
  'topLeftRadius',
  'topRightRadius',
  'bottomRightRadius',
  'bottomLeftRadius',
] as const;

const captureNodeProps = async (
  figmaCtx: typeof figma,
  tool: string,
  id: string,
  props: readonly string[],
  options: PropsOptions,
): Promise<PropsState> => {
  const node = await nodeForOp(figmaCtx, id, tool);
  const required = props[0];
  if (required === undefined || !(required in node)) {
    throw new Error(`${batchTool(tool)}: node ${id} has no ${required ?? 'property to restore'}`);
  }
  const hasRunFills = isTextLike(node) && props.includes('fills');
  return {
    id,
    props: await captureProps(figmaCtx, node, props, options.bindings ?? props),
    text: hasRunFills ? await captureText(figmaCtx, node) : null,
  };
};

const restoreNodeProps = async (
  figmaCtx: typeof figma,
  state: PropsState,
): Promise<string | undefined> => {
  const node = await liveNode(figmaCtx, state.id);
  if (node === null) return undefined;
  await restoreProps(node, state.props);
  return state.text !== null && isTextLike(node)
    ? restoreText(figmaCtx, node, state.text)
    : undefined;
};

export const propsSpec = <P>(
  tool: string,
  idOf: (params: P) => string,
  props: readonly string[],
  options: PropsOptions = {},
): InverseSpec<P, PropsState> => ({
  capture: async (figmaCtx, params) =>
    captureNodeProps(figmaCtx, tool, idOf(params), props, options),
  undo: async (figmaCtx, state) => restoreNodeProps(figmaCtx, state),
  touches: state => [state.id],
  ...(options.resizes === true && { resizes: (state: PropsState) => [state.id] }),
});

export const nodeIdOf = ({ nodeId }: { readonly nodeId: string }): string => nodeId;

export const propsInverse = (
  tool: string,
  schema: z.ZodType<{ nodeId: string }>,
  props: readonly string[],
  options: PropsOptions = {},
): BatchInverse => defineInverse(tool, schema, propsSpec(tool, nodeIdOf, props, options));
