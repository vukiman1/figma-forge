import { BIND_COMPONENT_PROPERTY_TOOL_NAME, bindComponentPropertyParams } from '@figma-forge/core';

import { type PropertyField } from '../../components/component-owner.js';
import { type BatchInverse, defineInverse } from '../inverse.js';
import { liveNode, nodeForOp } from '../live-node.js';
import { captureText, type TextSnapshot } from '../snapshot/text-capture.js';
import { restoreText } from '../snapshot/text-restore.js';
import { readField, same, writeIfDifferent } from '../snapshot/values.js';
import { swapBack } from '../swap-back.js';

const TOOL = BIND_COMPONENT_PROPERTY_TOOL_NAME;

const REFERENCES = 'componentPropertyReferences';

interface BindPropertyState {
  readonly id: string;
  readonly refs: Readonly<Record<string, unknown>>;
  readonly visible: boolean | null;
  readonly text: TextSnapshot | null;
  readonly mainId: string | null;
}

const referencesOf = (node: BaseNode): Record<string, unknown> => {
  const current = readField(node, REFERENCES);
  return typeof current === 'object' && current !== null ? { ...current } : {};
};

const visibleOf = (node: BaseNode, field: PropertyField): boolean | null =>
  field === 'visible' && 'visible' in node ? node.visible : null;

const mainIdOf = async (node: BaseNode, field: PropertyField): Promise<string | null> => {
  if (field !== 'mainComponent' || node.type !== 'INSTANCE') return null;
  const main = await node.getMainComponentAsync();
  return main?.id ?? null;
};

const restoreBinding = async (
  figmaCtx: typeof figma,
  node: BaseNode,
  state: BindPropertyState,
): Promise<string | undefined> => {
  if (!same(readField(node, REFERENCES) ?? {}, state.refs)) {
    Reflect.set(node, REFERENCES, state.refs);
  }
  if (state.visible !== null) writeIfDifferent(node, 'visible', state.visible);
  if (state.mainId !== null && node.type === 'INSTANCE') {
    await swapBack(figmaCtx, node, state.mainId);
  }
  return state.text === null || node.type !== 'TEXT'
    ? undefined
    : restoreText(figmaCtx, node, state.text);
};

export const bindComponentPropertyInverse: BatchInverse = defineInverse(
  TOOL,
  bindComponentPropertyParams,
  {
    capture: async (figmaCtx, { nodeId, field }): Promise<BindPropertyState> => {
      const node = await nodeForOp(figmaCtx, nodeId, TOOL);
      return {
        id: nodeId,
        refs: referencesOf(node),
        visible: visibleOf(node, field),
        text:
          field === 'characters' && node.type === 'TEXT' ? await captureText(figmaCtx, node) : null,
        mainId: await mainIdOf(node, field),
      };
    },
    undo: async (figmaCtx, state) => {
      const node = await liveNode(figmaCtx, state.id);
      return node === null ? undefined : restoreBinding(figmaCtx, node, state);
    },
    touches: ({ id }) => [id],
    resizes: ({ id }) => [id],
  },
);
