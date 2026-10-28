import { BOOLEAN_NODES_TOOL_NAME as TOOL, booleanNodesParams } from '@figma-forge/core';
import type { z } from 'zod';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { writePaints } from '../paint/write-paints.js';
import { parseParams } from '../parse-params.js';
import { createdResult } from './new-node.js';
import { resolveSharedParent, type SharedParent } from './shared-parent.js';

type BooleanOperation = z.output<typeof booleanNodesParams>['operation'];

const FIGMA_OPERATION = {
  UNION: 'union',
  SUBTRACT: 'subtract',
  INTERSECT: 'intersect',
  EXCLUDE: 'exclude',
} as const satisfies Record<BooleanOperation, keyof PluginAPI>;

const combine = (
  figmaCtx: typeof figma,
  operation: BooleanOperation,
  { nodes, parent, index }: SharedParent,
): BooleanOperationNode => figmaCtx[FIGMA_OPERATION[operation]](nodes, parent, index);

const styleIdOf = (node: SceneNode, key: 'fillStyleId' | 'effectStyleId'): string | null => {
  const id: unknown = key in node ? Reflect.get(node, key) : undefined;
  return typeof id === 'string' && id !== '' ? id : null;
};

const carryFills = async (source: SceneNode, result: BooleanOperationNode): Promise<void> => {
  const style = styleIdOf(source, 'fillStyleId');
  if (style !== null) await result.setFillStyleIdAsync(style);
  else if ('fills' in source && typeof source.fills !== 'symbol') {
    await writePaints(result, 'fills', source.fills);
  }
};

const carryEffects = async (source: SceneNode, result: BooleanOperationNode): Promise<void> => {
  const style = styleIdOf(source, 'effectStyleId');
  if (style !== null) await result.setEffectStyleIdAsync(style);
  else if ('effects' in source) result.effects = source.effects;
};

export const createBooleanNodesHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const { operation, nodeIds, name } = parseParams(TOOL, booleanNodesParams, raw);
    const operands = await resolveSharedParent(figmaCtx, [...new Set(nodeIds)], TOOL);
    const source = operation === 'SUBTRACT' ? operands.nodes[0] : operands.nodes.at(-1);
    const result = combine(figmaCtx, operation, operands);
    if (source !== undefined) {
      await carryFills(source, result);
      await carryEffects(source, result);
    }
    if (name !== undefined) result.name = name;
    return createdResult(result);
  };
