import { COMBINE_AS_VARIANTS_TOOL_NAME, combineAsVariantsParams } from '@figma-forge/core';

import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { liveNode, nodeForOp } from '../live-node.js';
import { removeLeftover } from '../op-result.js';
import {
  captureRehome,
  parentIds,
  refuseVariantLeaving,
  type Rehome,
  undoRehome,
} from './rehome.js';

const BATCH_TOOL = batchTool(COMBINE_AS_VARIANTS_TOOL_NAME);

interface PropertyKeys {
  readonly id: string;
  readonly keys: readonly string[];
}

interface CombineState {
  readonly rehome: Rehome;
  readonly properties: readonly PropertyKeys[];
}

const asComponent = (node: BaseNode): ComponentNode => {
  if (node.type !== 'COMPONENT') {
    throw new Error(`${BATCH_TOOL}: node ${node.id} is a ${node.type}, not a COMPONENT`);
  }
  return node;
};

const requireComponents = async (
  figmaCtx: typeof figma,
  nodeIds: readonly string[],
): Promise<ComponentNode[]> => {
  const nodes = await Promise.all(
    nodeIds.map(async id => nodeForOp(figmaCtx, id, COMBINE_AS_VARIANTS_TOOL_NAME)),
  );
  return nodes.map(asComponent);
};

const destinationOf = async (
  figmaCtx: typeof figma,
  parentId: string | undefined,
): Promise<(BaseNode & ChildrenMixin)[]> => {
  if (parentId === undefined) return [];
  const parent = await nodeForOp(figmaCtx, parentId, COMBINE_AS_VARIANTS_TOOL_NAME);
  if (parent.type === 'DOCUMENT' || !('appendChild' in parent)) {
    throw new Error(`${BATCH_TOOL}: ${parentId} cannot contain children`);
  }
  return [parent];
};

const propertyKeysOf = (component: ComponentNode): PropertyKeys => ({
  id: component.id,
  keys: Object.keys(component.componentPropertyDefinitions),
});

const dropAddedProperties = (node: BaseNode | null, { keys }: PropertyKeys): void => {
  if (node?.type !== 'COMPONENT') return;
  Object.keys(node.componentPropertyDefinitions)
    .filter(key => !keys.includes(key))
    .forEach(key => node.deleteComponentProperty(key));
};

const undoCombine = async (
  figmaCtx: typeof figma,
  { rehome, properties }: CombineState,
  result: unknown,
): Promise<undefined> => {
  await undoRehome(figmaCtx, rehome);
  await removeLeftover(figmaCtx, result);
  const components = await Promise.all(properties.map(async ({ id }) => liveNode(figmaCtx, id)));
  properties.forEach((property, index) => dropAddedProperties(components[index] ?? null, property));
  return undefined;
};

export const combineAsVariantsInverse: BatchInverse = defineInverse(
  COMBINE_AS_VARIANTS_TOOL_NAME,
  combineAsVariantsParams,
  {
    capture: async (figmaCtx, { nodeIds, parentId }): Promise<CombineState> => {
      const components = await requireComponents(figmaCtx, nodeIds);
      refuseVariantLeaving(COMBINE_AS_VARIANTS_TOOL_NAME, components, null);
      const also = await destinationOf(figmaCtx, parentId);
      return {
        rehome: captureRehome(components, also),
        properties: components.map(propertyKeysOf),
      };
    },
    undo: undoCombine,
    resizes: ({ rehome }) => parentIds(rehome),
    moves: async (_figmaCtx, { nodeIds }) => ({ nodeIds, destinationId: null }),
  },
);
