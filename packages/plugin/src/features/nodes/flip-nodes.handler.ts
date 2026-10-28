import {
  type BatchNodeResult,
  FLIP_NODES_TOOL_NAME as TOOL,
  flipNodesParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { flipped } from './flip-transform.js';

type Flippable = BaseNode & LayoutMixin;

const INSTANCE_SUBLAYER_PREFIX = 'I';

const isFlippable = (node: BaseNode | null): node is Flippable =>
  node !== null && 'relativeTransform' in node;

const requireFlippable = async (
  figmaCtx: typeof figma,
  ids: readonly string[],
): Promise<Flippable[]> => {
  const nodes = await Promise.all(ids.map(async id => figmaCtx.getNodeByIdAsync(id)));
  const missing = ids.filter((_id, index) => !isFlippable(nodes[index] ?? null));
  if (missing.length > 0)
    throw new Error(`${TOOL}: ${missing.join(', ')} not found or cannot be flipped`);
  const inInstance = ids.filter(id => id.startsWith(INSTANCE_SUBLAYER_PREFIX));
  if (inInstance.length > 0) {
    throw new Error(
      `${TOOL}: ${inInstance.join(', ')} ${inInstance.length === 1 ? 'is' : 'are'} inside an ` +
        'instance, which cannot override a layer’s transform — flip the instance itself, or the ' +
        'layer in its main component',
    );
  }
  return nodes.filter(isFlippable);
};

export const createFlipNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeIds, axis } = parseParams(TOOL, flipNodesParams, raw);
    for (const node of await requireFlippable(figmaCtx, nodeIds)) {
      node.relativeTransform = flipped(node.relativeTransform, node.width, node.height, axis);
    }
    const result: BatchNodeResult = { ok: true, affected: [...nodeIds] };
    return result;
  };
