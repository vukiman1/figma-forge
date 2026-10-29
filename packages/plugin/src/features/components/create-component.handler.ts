import {
  CREATE_COMPONENT_TOOL_NAME as TOOL,
  type CreateResult,
  createComponentParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { placeNode } from '../nodes/place-node.js';
import { parseParams } from '../parse-params.js';
import { requireNode } from '../require-node.js';

const NOT_CONVERTIBLE: ReadonlySet<NodeType> = new Set([
  'PAGE',
  'DOCUMENT',
  'COMPONENT',
  'COMPONENT_SET',
]);

const isConvertible = (node: BaseNode): node is SceneNode => !NOT_CONVERTIBLE.has(node.type);

const componentFrom = async (figmaCtx: typeof figma, nodeId: string): Promise<ComponentNode> => {
  const source = await requireNode(figmaCtx, TOOL, nodeId);
  if (!isConvertible(source)) {
    throw new Error(`${TOOL}: node ${nodeId} (${source.type}) can't be turned into a component`);
  }
  return figmaCtx.createComponentFromNode(source);
};

export const createCreateComponentHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { fromNodeId, parentId, name, x, y, width, height } = parseParams(
      TOOL,
      createComponentParams,
      raw,
    );
    const component =
      fromNodeId === undefined
        ? figmaCtx.createComponent()
        : await componentFrom(figmaCtx, fromNodeId);
    if (name !== undefined) component.name = name;
    if (width !== undefined && height !== undefined) component.resize(width, height);
    if (x !== undefined) component.x = x;
    if (y !== undefined) component.y = y;
    if (fromNodeId === undefined || parentId !== undefined) {
      await placeNode(figmaCtx, component, parentId, TOOL);
    }
    const result: CreateResult = {
      ok: true,
      nodeId: component.id,
      name: component.name,
      type: component.type,
    };
    return result;
  };
