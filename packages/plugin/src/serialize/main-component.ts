import type { SerializedNode } from '@figma-forge/core';

type MainComponent = NonNullable<SerializedNode['mainComponent']>;

const describeMainComponent = (main: ComponentNode): MainComponent => {
  const out: MainComponent = { id: main.id, name: main.name, key: main.key };
  const parent = main.parent;
  if (parent != null && parent.type === 'COMPONENT_SET') {
    out.componentSetId = parent.id;
    out.componentSetName = parent.name;
  }
  return out;
};

export const resolveMainComponent = async (node: SceneNode): Promise<MainComponent | undefined> => {
  if (node.type !== 'INSTANCE') return undefined;
  try {
    const main = await node.getMainComponentAsync();
    return main === null ? undefined : describeMainComponent(main);
  } catch {
    return undefined;
  }
};
