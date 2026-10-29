import { requireNode } from '../require-node.js';

export const PROPERTY_TYPES = ['BOOLEAN', 'TEXT', 'INSTANCE_SWAP'] as const;
export type AuthorablePropertyType = (typeof PROPERTY_TYPES)[number];

export type PropertyField = 'visible' | 'characters' | 'mainComponent';

export type PropertyOwner = ComponentNode | ComponentSetNode;

export const FIELD_FOR_TYPE: Readonly<Record<AuthorablePropertyType, PropertyField>> = {
  BOOLEAN: 'visible',
  TEXT: 'characters',
  INSTANCE_SWAP: 'mainComponent',
};

export const isAuthorable = (type: ComponentPropertyType): type is AuthorablePropertyType =>
  PROPERTY_TYPES.some(authorable => authorable === type);

export const variantSetOrSelf = (component: ComponentNode): PropertyOwner =>
  component.parent?.type === 'COMPONENT_SET' ? component.parent : component;

export const resolveComponentOwner = (tool: string, node: BaseNode): PropertyOwner => {
  if (node.type === 'COMPONENT_SET') return node;
  if (node.type === 'COMPONENT') return variantSetOrSelf(node);
  if (node.type === 'INSTANCE') {
    throw new Error(
      `${tool}: ${node.id} is an INSTANCE — author properties on its main component, not an instance`,
    );
  }
  throw new Error(`${tool}: ${node.id} (${node.type}) is not a component or component set`);
};

export const requireComponentOwner = async (
  figmaCtx: typeof figma,
  tool: string,
  componentId: string,
): Promise<PropertyOwner> =>
  resolveComponentOwner(tool, await requireNode(figmaCtx, tool, componentId));

export const owningComponents = (node: BaseNode): PropertyOwner[] => {
  for (let current: BaseNode | null = node; current !== null; current = current.parent) {
    if (current.type === 'COMPONENT_SET') return [current];
    if (current.type === 'COMPONENT') return [variantSetOrSelf(current)];
  }
  return [];
};

export const propertyDisplayName = (propertyId: string): string => {
  const hash = propertyId.lastIndexOf('#');
  return hash === -1 ? propertyId : propertyId.slice(0, hash);
};
