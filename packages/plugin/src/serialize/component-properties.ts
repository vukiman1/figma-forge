import type { SerializedComponentProperty, SerializedNode } from '@figma-forge/core';

type PropertyReferences = NonNullable<SerializedNode['componentPropertyReferences']>;

const REFERENCE_FIELDS = ['visible', 'characters', 'mainComponent'] as const;

const toComponentProperty = (definition: unknown): SerializedComponentProperty | undefined => {
  if (typeof definition !== 'object' || definition === null) return undefined;
  const type: unknown = Reflect.get(definition, 'type');
  const value: unknown = Reflect.get(definition, 'value');
  if (typeof type !== 'string') return undefined;
  if (typeof value !== 'string' && typeof value !== 'boolean') return undefined;
  return { type, value };
};

export const collectComponentProperties = (node: SceneNode, out: SerializedNode): void => {
  const raw: unknown = Reflect.get(node, 'componentProperties');
  if (typeof raw !== 'object' || raw === null) return;
  const props: Record<string, SerializedComponentProperty> = {};
  for (const [name, definition] of Object.entries(raw)) {
    const property = toComponentProperty(definition);
    if (property !== undefined) props[name] = property;
  }
  if (Object.keys(props).length > 0) out.componentProperties = props;
};

export const collectPropertyReferences = (node: SceneNode, out: SerializedNode): void => {
  const raw: unknown = Reflect.get(node, 'componentPropertyReferences');
  if (typeof raw !== 'object' || raw === null) return;
  const refs: PropertyReferences = {};
  for (const field of REFERENCE_FIELDS) {
    const value: unknown = Reflect.get(raw, field);
    if (typeof value === 'string' && value !== '') refs[field] = value;
  }
  if (Object.keys(refs).length > 0) out.componentPropertyReferences = refs;
};
