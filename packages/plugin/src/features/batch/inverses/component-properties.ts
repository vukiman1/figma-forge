import {
  ADD_COMPONENT_PROPERTY_TOOL_NAME,
  addComponentPropertyParams,
  EDIT_COMPONENT_PROPERTY_TOOL_NAME,
  editComponentPropertyParams,
} from '@figma-forge/core';

import {
  type PropertyOwner,
  propertyDisplayName,
  resolveComponentOwner,
} from '../../components/component-owner.js';
import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { liveNode, nodeForOp } from '../live-node.js';
import { resultId } from '../op-result.js';

type PropertyEdit = Parameters<PropertyOwner['editComponentProperty']>[1];

interface EditPropertyState {
  readonly ownerId: string;
  readonly previous: PropertyEdit;
}

const TOOL = batchTool(EDIT_COMPONENT_PROPERTY_TOOL_NAME);

const isPropertyOwner = (node: BaseNode | null): node is PropertyOwner =>
  node?.type === 'COMPONENT' || node?.type === 'COMPONENT_SET';

const liveOwner = async (figmaCtx: typeof figma, id: string): Promise<PropertyOwner | null> => {
  const node = await liveNode(figmaCtx, id);
  return isPropertyOwner(node) ? node : null;
};

export const editComponentPropertyInverse: BatchInverse = defineInverse(
  EDIT_COMPONENT_PROPERTY_TOOL_NAME,
  editComponentPropertyParams,
  {
    capture: async (figmaCtx, params): Promise<EditPropertyState> => {
      const { componentId, propertyId } = params;
      const node = await nodeForOp(figmaCtx, componentId, EDIT_COMPONENT_PROPERTY_TOOL_NAME);
      const owner = resolveComponentOwner(TOOL, node);
      const definition = owner.componentPropertyDefinitions[propertyId];
      if (definition === undefined) {
        throw new Error(`${TOOL}: property ${propertyId} not found on ${owner.id}`);
      }
      const previous: PropertyEdit = {
        ...(params.name !== undefined && { name: propertyDisplayName(propertyId) }),
        ...(params.defaultValue !== undefined && {
          defaultValue: definition.boundVariables?.defaultValue ?? definition.defaultValue,
        }),
        ...(params.preferredValues !== undefined && {
          preferredValues: [...(definition.preferredValues ?? [])],
        }),
      };
      return { ownerId: owner.id, previous };
    },
    undo: async (figmaCtx, { ownerId, previous }, result) => {
      const propertyId = resultId(result, 'propertyId');
      const owner = await liveOwner(figmaCtx, ownerId);
      if (owner !== null && propertyId !== null) owner.editComponentProperty(propertyId, previous);
      return undefined;
    },
  },
);

const removeAddedProperty = async (figmaCtx: typeof figma, result: unknown): Promise<void> => {
  const propertyId = resultId(result, 'propertyId');
  const ownerId = resultId(result, 'componentId');
  if (propertyId === null || ownerId === null) return;
  const owner = await liveOwner(figmaCtx, ownerId);
  if (owner !== null && propertyId in owner.componentPropertyDefinitions) {
    owner.deleteComponentProperty(propertyId);
  }
};

export const addComponentPropertyInverse: BatchInverse = defineInverse(
  ADD_COMPONENT_PROPERTY_TOOL_NAME,
  addComponentPropertyParams,
  {
    capture: async (): Promise<null> => null,
    undo: async (figmaCtx, _state, result) => {
      await removeAddedProperty(figmaCtx, result);
      return undefined;
    },
  },
);
