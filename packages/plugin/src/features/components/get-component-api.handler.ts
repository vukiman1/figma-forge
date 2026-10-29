import {
  type ComponentPropertyApiEntry,
  GET_COMPONENT_API_TOOL_NAME as TOOL,
  getComponentApiParams,
  type GetComponentApiResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireNode } from '../require-node.js';
import { type PropertyOwner, variantSetOrSelf } from './component-owner.js';

const ownerOf = async (node: BaseNode): Promise<PropertyOwner | null> => {
  if (node.type === 'COMPONENT_SET') return node;
  if (node.type === 'COMPONENT') return variantSetOrSelf(node);
  if (node.type !== 'INSTANCE') return null;
  const main = await node.getMainComponentAsync();
  return main === null ? null : variantSetOrSelf(main);
};

const toApiEntry = (
  definition: ComponentPropertyDefinitions[string],
): ComponentPropertyApiEntry => ({
  type: definition.type,
  defaultValue: definition.defaultValue,
  ...(definition.variantOptions === undefined
    ? {}
    : { variantOptions: [...definition.variantOptions] }),
  ...(definition.preferredValues === undefined
    ? {}
    : {
        preferredValues: definition.preferredValues.map(value => ({
          type: value.type,
          key: value.key,
        })),
      }),
  ...(typeof definition.description === 'string' && definition.description !== ''
    ? { description: definition.description }
    : {}),
});

export const createGetComponentApiHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId } = parseParams(TOOL, getComponentApiParams, raw);
    const node = await requireNode(figmaCtx, TOOL, nodeId);
    const owner = await ownerOf(node);
    if (owner === null) {
      throw new Error(
        `${TOOL}: node ${nodeId} (${node.type}) is not a component, component set, or instance`,
      );
    }
    const properties = Object.fromEntries(
      Object.entries(owner.componentPropertyDefinitions).map(([name, definition]) => [
        name,
        toApiEntry(definition),
      ]),
    );
    const result: GetComponentApiResult = {
      id: owner.id,
      name: owner.name,
      type: owner.type,
      properties,
    };
    return result;
  };
