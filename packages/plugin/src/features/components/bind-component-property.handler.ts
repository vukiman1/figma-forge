import {
  BIND_COMPONENT_PROPERTY_TOOL_NAME as TOOL,
  bindComponentPropertyParams,
  type MutateResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { requireNode } from '../require-node.js';
import {
  FIELD_FOR_TYPE,
  isAuthorable,
  owningComponents,
  type PropertyField,
} from './component-owner.js';

type References = Partial<Record<PropertyField, string>>;

const NODE_TYPE_FOR_FIELD: Partial<Record<PropertyField, NodeType>> = {
  characters: 'TEXT',
  mainComponent: 'INSTANCE',
};

const assertFieldFitsNode = (node: BaseNode, field: PropertyField): void => {
  const required = NODE_TYPE_FOR_FIELD[field];
  if (required === undefined || node.type === required) return;
  throw new Error(`${TOOL}: field "${field}" requires a ${required} node, got ${node.type}`);
};

const assertBindable = (node: BaseNode, propertyId: string, field: PropertyField): void => {
  const owners = owningComponents(node);
  if (owners.length === 0) {
    throw new Error(
      `${TOOL}: ${node.id} is not inside a component — nothing to bind a property to`,
    );
  }
  const definition = owners
    .map(owner => owner.componentPropertyDefinitions[propertyId])
    .find(candidate => candidate !== undefined);
  if (definition === undefined) {
    throw new Error(
      `${TOOL}: property ${propertyId} not found on the containing component ` +
        '(add it with add_component_property first)',
    );
  }
  if (!isAuthorable(definition.type)) {
    throw new Error(
      `${TOOL}: property ${propertyId} is a ${definition.type} property, which isn't bound this way`,
    );
  }
  const expected = FIELD_FOR_TYPE[definition.type];
  if (expected !== field) {
    throw new Error(
      `${TOOL}: a ${definition.type} property binds to "${expected}", not "${field}"`,
    );
  }
};

const referencesOf = (node: BaseNode): References => {
  const current: unknown = Reflect.get(node, 'componentPropertyReferences');
  return typeof current === 'object' && current !== null ? { ...current } : {};
};

export const createBindComponentPropertyHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { nodeId, field, propertyId } = parseParams(TOOL, bindComponentPropertyParams, raw);
    const node = await requireNode(figmaCtx, TOOL, nodeId);
    assertFieldFitsNode(node, field);
    const { [field]: _unbound, ...kept } = referencesOf(node);
    if (propertyId !== null) assertBindable(node, propertyId, field);
    const references = propertyId === null ? kept : { ...kept, [field]: propertyId };
    Reflect.set(node, 'componentPropertyReferences', references);
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
