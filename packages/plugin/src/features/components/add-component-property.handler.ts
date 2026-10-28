import {
  ADD_COMPONENT_PROPERTY_TOOL_NAME as TOOL,
  addComponentPropertyParams,
  type ComponentPropertyResult,
} from '@figma-forge/core';
import type { z } from 'zod';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireComponentOwner } from './component-owner.js';

type AddParams = z.output<typeof addComponentPropertyParams>;

const assertDefaultFitsType = ({ type, defaultValue, preferredValues }: AddParams): void => {
  if (type === 'BOOLEAN' && typeof defaultValue !== 'boolean') {
    throw new TypeError(`${TOOL}: a BOOLEAN property needs a boolean defaultValue`);
  }
  if (type !== 'BOOLEAN' && typeof defaultValue !== 'string') {
    const hint = type === 'INSTANCE_SWAP' ? ' (a component key)' : '';
    throw new TypeError(`${TOOL}: a ${type} property needs a string defaultValue${hint}`);
  }
  if (preferredValues !== undefined && type !== 'INSTANCE_SWAP') {
    throw new TypeError(`${TOOL}: preferredValues is only valid for an INSTANCE_SWAP property`);
  }
};

export const createAddComponentPropertyHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, addComponentPropertyParams, raw);
    assertDefaultFitsType(params);
    const owner = await requireComponentOwner(figmaCtx, TOOL, params.componentId);
    const options =
      params.preferredValues === undefined
        ? undefined
        : { preferredValues: params.preferredValues };
    const propertyId = owner.addComponentProperty(
      params.name,
      params.type,
      params.defaultValue,
      options,
    );
    const result: ComponentPropertyResult = {
      ok: true,
      componentId: owner.id,
      propertyId,
      name: params.name,
    };
    return result;
  };
