import {
  SET_INSTANCE_PROPERTIES_TOOL_NAME,
  setInstancePropertiesParams,
  SWAP_COMPONENT_TOOL_NAME,
  swapComponentParams,
} from '@figma-forge/core';

import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { liveNode, nodeForOp } from '../live-node.js';
import { type PropertyValue, propertyValues } from '../overrides/override-list.js';
import { same } from '../snapshot/values.js';
import { swapBack } from '../swap-back.js';

interface InstanceState {
  readonly id: string;
  readonly mainId: string;
  readonly properties: Readonly<Record<string, PropertyValue>>;
}

const instanceForOp = async (
  figmaCtx: typeof figma,
  id: string,
  tool: string,
): Promise<InstanceNode> => {
  const node = await nodeForOp(figmaCtx, id, tool);
  if (node.type !== 'INSTANCE')
    throw new Error(`${batchTool(tool)}: node ${id} is not an INSTANCE`);
  return node;
};

const mainIdOf = async (instance: InstanceNode, failure: string): Promise<string> => {
  const main = await instance.getMainComponentAsync();
  if (main === null) throw new Error(failure);
  return main.id;
};

const liveInstance = async (figmaCtx: typeof figma, id: string): Promise<InstanceNode | null> => {
  const node = await liveNode(figmaCtx, id);
  return node?.type === 'INSTANCE' ? node : null;
};

const previousValues = (
  instance: InstanceNode,
  keys: readonly string[],
): Record<string, PropertyValue> => {
  const current = propertyValues(instance);
  return Object.fromEntries(
    keys.flatMap(key => {
      const value = current[key];
      return value === undefined ? [] : [[key, value] as const];
    }),
  );
};

const changedValues = (
  instance: InstanceNode,
  previous: Readonly<Record<string, PropertyValue>>,
): Record<string, PropertyValue> => {
  const now = propertyValues(instance);
  return Object.fromEntries(
    Object.entries(previous).filter(([key, value]) => !same(now[key], value)),
  );
};

const instanceIds = (state: InstanceState): string[] => [state.id];

export const setInstancePropertiesInverse: BatchInverse = defineInverse(
  SET_INSTANCE_PROPERTIES_TOOL_NAME,
  setInstancePropertiesParams,
  {
    capture: async (figmaCtx, { instanceId, properties }): Promise<InstanceState> => {
      const tool = SET_INSTANCE_PROPERTIES_TOOL_NAME;
      const instance = await instanceForOp(figmaCtx, instanceId, tool);
      const previous = previousValues(instance, Object.keys(properties));
      const failure = `${batchTool(tool)}: ${instance.id} has no main component to return to`;
      return { id: instance.id, mainId: await mainIdOf(instance, failure), properties: previous };
    },
    undo: async (figmaCtx, state) => {
      const instance = await liveInstance(figmaCtx, state.id);
      if (instance === null) return undefined;
      const changed = changedValues(instance, state.properties);
      if (Object.keys(changed).length > 0) instance.setProperties(changed);
      await swapBack(figmaCtx, instance, state.mainId);
      return undefined;
    },
    touches: instanceIds,
    resizes: instanceIds,
  },
);

export const swapComponentInverse: BatchInverse = defineInverse(
  SWAP_COMPONENT_TOOL_NAME,
  swapComponentParams,
  {
    capture: async (figmaCtx, { instanceId }): Promise<InstanceState> => {
      const tool = SWAP_COMPONENT_TOOL_NAME;
      const instance = await instanceForOp(figmaCtx, instanceId, tool);
      const failure = `${batchTool(tool)}: ${instance.id} has no main component to swap back to`;
      return { id: instance.id, mainId: await mainIdOf(instance, failure), properties: {} };
    },
    undo: async (figmaCtx, state) => {
      const instance = await liveInstance(figmaCtx, state.id);
      if (instance !== null) await swapBack(figmaCtx, instance, state.mainId);
      return undefined;
    },
    touches: instanceIds,
    resizes: instanceIds,
  },
);
