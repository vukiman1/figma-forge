import {
  type ComponentPropertyResult,
  DELETE_COMPONENT_PROPERTY_TOOL_NAME as TOOL,
  deleteComponentPropertyParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { propertyDisplayName, requireComponentOwner } from './component-owner.js';

export const createDeleteComponentPropertyHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { componentId, propertyId } = parseParams(TOOL, deleteComponentPropertyParams, raw);
    const owner = await requireComponentOwner(figmaCtx, TOOL, componentId);
    const definition = owner.componentPropertyDefinitions[propertyId];
    if (definition === undefined) {
      throw new Error(`${TOOL}: property ${propertyId} not found on ${owner.id}`);
    }
    if (definition.type === 'VARIANT') {
      throw new Error(
        `${TOOL}: ${propertyId} is a VARIANT property — remove its variants instead of deleting the property`,
      );
    }
    owner.deleteComponentProperty(propertyId);
    const result: ComponentPropertyResult = {
      ok: true,
      componentId: owner.id,
      propertyId,
      name: propertyDisplayName(propertyId),
    };
    return result;
  };
