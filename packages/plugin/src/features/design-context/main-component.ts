import type { DesignContextNode } from '@figma-forge/core';

type MainComponentRef = NonNullable<DesignContextNode['mainComponent']>;

export const mainComponentRef = (main: ComponentNode): MainComponentRef => {
  const set = main.parent;
  return {
    id: main.id,
    name: main.name,
    key: main.key,
    ...(set?.type === 'COMPONENT_SET' && { componentSetId: set.id, componentSetName: set.name }),
  };
};
