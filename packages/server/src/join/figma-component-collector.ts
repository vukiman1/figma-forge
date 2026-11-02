import type { DesignContextNode } from '@figma-forge/core';

import type { ComponentSetIndex, FigmaComponentUsage } from './component-mapping.js';

interface ComponentIdentity {
  name: string;
  groupId?: string;
}

const findComponentIdentity = (
  node: DesignContextNode,
  setIndex: ComponentSetIndex,
): ComponentIdentity => {
  const variantId = node.mainComponentId ?? node.mainComponent?.id;
  const carriedSetName = node.mainComponent?.componentSetName;
  const componentSet =
    carriedSetName === undefined
      ? variantId === undefined
        ? undefined
        : setIndex.get(variantId)
      : { id: node.mainComponent?.componentSetId, name: carriedSetName };
  const groupId = componentSet?.id ?? variantId;
  return {
    name: componentSet?.name ?? node.mainComponent?.name ?? node.name,
    ...(groupId === undefined ? {} : { groupId }),
  };
};

const createUsage = (identity: ComponentIdentity): FigmaComponentUsage => ({
  name: identity.name,
  ...(identity.groupId === undefined ? {} : { mainComponentId: identity.groupId }),
  variantAxes: [],
  instances: [],
  instanceCount: 0,
});

const collectProps = (
  node: DesignContextNode,
  usage: FigmaComponentUsage,
): Record<string, string | boolean> => {
  const props: Record<string, string | boolean> = {};
  for (const [axis, property] of Object.entries(node.componentProperties ?? {})) {
    const label = axis.split('#')[0] ?? axis;
    props[label] = property.value;
    if (!usage.variantAxes.includes(label)) usage.variantAxes.push(label);
  }
  return props;
};

const collectInstance = (
  node: DesignContextNode,
  usages: Map<string, FigmaComponentUsage>,
  setIndex: ComponentSetIndex,
): void => {
  const identity = findComponentIdentity(node, setIndex);
  const key = identity.groupId ?? identity.name;
  const usage = usages.get(key) ?? createUsage(identity);
  usages.set(key, usage);
  usage.instanceCount += 1;
  const props = collectProps(node, usage);
  usage.instances.push({
    nodeId: node.id,
    ...(Object.keys(props).length === 0 ? {} : { props }),
  });
};

const visitNode = (
  node: DesignContextNode,
  usages: Map<string, FigmaComponentUsage>,
  setIndex: ComponentSetIndex,
): void => {
  if (node.type === 'INSTANCE') collectInstance(node, usages, setIndex);
  for (const child of node.children ?? []) visitNode(child, usages, setIndex);
};

export const collectFigmaComponents = (
  roots: readonly DesignContextNode[],
  setIndex: ComponentSetIndex = new Map(),
): FigmaComponentUsage[] => {
  const usages = new Map<string, FigmaComponentUsage>();
  for (const root of roots) visitNode(root, usages, setIndex);
  return [...usages.values()];
};
