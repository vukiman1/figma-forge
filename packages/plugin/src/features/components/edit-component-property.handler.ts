import {
  type ComponentPropertyResult,
  EDIT_COMPONENT_PROPERTY_TOOL_NAME as TOOL,
  editComponentPropertyParams,
  pickDefined,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { propertyDisplayName, requireComponentOwner } from './component-owner.js';

const EDITABLE_FIELDS = ['name', 'defaultValue', 'preferredValues'] as const;

export const createEditComponentPropertyHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, editComponentPropertyParams, raw);
    const changes = pickDefined(params, EDITABLE_FIELDS);
    if (Object.keys(changes).length === 0) {
      throw new TypeError(`${TOOL}: supply at least one of name / defaultValue / preferredValues`);
    }
    const owner = await requireComponentOwner(figmaCtx, TOOL, params.componentId);
    const definition = owner.componentPropertyDefinitions[params.propertyId];
    if (definition === undefined) {
      throw new Error(
        `${TOOL}: property ${params.propertyId} not found on ${owner.id} ` +
          '(get_component_api lists the current ids)',
      );
    }
    if (changes.preferredValues !== undefined && definition.type !== 'INSTANCE_SWAP') {
      throw new TypeError(
        `${TOOL}: preferredValues can only be edited on an INSTANCE_SWAP property`,
      );
    }
    const propertyId = owner.editComponentProperty(params.propertyId, changes);
    const result: ComponentPropertyResult = {
      ok: true,
      componentId: owner.id,
      propertyId,
      name: propertyDisplayName(propertyId),
    };
    return result;
  };
