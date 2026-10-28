import { isSceneNode } from '../../nodes/scene-node.js';
import { isTextLike } from '../../text/text-like.js';
import type { UndoNote } from '../inverse.js';
import { liveNode } from '../live-node.js';
import { type BindingSnapshot, rebind, unbindAdded } from '../snapshot/bindings.js';
import { type GeometrySnapshot, restoreGeometry } from '../snapshot/geometry.js';
import { captureProps, type PropsSnapshot, restoreProps } from '../snapshot/props.js';
import { captureText, type TextSnapshot } from '../snapshot/text-capture.js';
import { restoreText } from '../snapshot/text-restore.js';

export interface NodeValueState {
  readonly id: string;
  readonly props: PropsSnapshot | null;
  readonly text: TextSnapshot | null;
  readonly geometry: GeometrySnapshot | null;
  readonly bindings: BindingSnapshot;
}

export const capturePropValue = async (
  figmaCtx: typeof figma,
  node: BaseNode,
  id: string,
  prop: string,
): Promise<NodeValueState> => ({
  id,
  props: await captureProps(figmaCtx, node, [prop]),
  text: isTextLike(node) && prop === 'fills' ? await captureText(figmaCtx, node) : null,
  geometry: null,
  bindings: {},
});

export const restoreNodeValue = async (
  figmaCtx: typeof figma,
  state: NodeValueState,
): Promise<UndoNote> => {
  const node = await liveNode(figmaCtx, state.id);
  if (node === null) return undefined;
  unbindAdded(node, state.bindings);
  if (state.props !== null) await restoreProps(node, state.props);
  if (state.geometry !== null && isSceneNode(node)) restoreGeometry(node, state.geometry);
  const hasText = state.text !== null && isTextLike(node);
  const note = hasText ? await restoreText(figmaCtx, node, state.text) : undefined;
  rebind(node, state.bindings);
  return note;
};

export const nodeValueIds = (state: NodeValueState): string[] => [state.id];
