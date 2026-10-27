import {
  COMBINE_AS_VARIANTS_TOOL_NAME as TOOL,
  combineAsVariantsParams,
  type CreateResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { requireNode } from '../require-node.js';

type Container = BaseNode & ChildrenMixin;

const requireComponent = async (figmaCtx: typeof figma, nodeId: string): Promise<ComponentNode> => {
  const node = await requireNode(figmaCtx, TOOL, nodeId);
  if (node.type !== 'COMPONENT')
    throw new Error(`${TOOL}: node ${nodeId} is a ${node.type}, not a COMPONENT`);
  return node;
};

const requireParent = async (
  figmaCtx: typeof figma,
  parentId: string | undefined,
  first: ComponentNode,
): Promise<Container> => {
  if (parentId === undefined) {
    if (first.parent === null)
      throw new Error(`${TOOL}: first component has no parent; pass parentId`);
    return first.parent;
  }
  const parent = await figmaCtx.getNodeByIdAsync(parentId);
  if (parent === null || parent.type === 'DOCUMENT' || !('appendChild' in parent)) {
    throw new Error(`${TOOL}: parent ${parentId} not found or cannot contain children`);
  }
  return parent;
};

export const createCombineAsVariantsHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeIds, parentId, name } = parseParams(TOOL, combineAsVariantsParams, raw);
    const components = await Promise.all(nodeIds.map(async id => requireComponent(figmaCtx, id)));
    const [first] = components;
    if (first === undefined)
      throw new TypeError(`${TOOL}: nodeIds must list at least 2 components`);
    const set = figmaCtx.combineAsVariants(
      components,
      await requireParent(figmaCtx, parentId, first),
    );
    if (name !== undefined) set.name = name;
    const result: CreateResult = { ok: true, nodeId: set.id, name: set.name, type: set.type };
    return result;
  };
