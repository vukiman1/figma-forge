import {
  BIND_VARIABLE_TO_PAINT_TOOL_NAME as TOOL,
  bindVariableToPaintParams,
  type MutateResult,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { writePaints } from '../paint/write-paints.js';
import { parseParams } from '../parse-params.js';
import { findVariable } from './lookup.js';

type PaintTarget = 'fills' | 'strokes';

const requirePaintedNode = async (
  figmaCtx: typeof figma,
  nodeId: string,
  target: PaintTarget,
): Promise<BaseNode> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node === null || !(target in node)) {
    throw new Error(`${TOOL}: node ${nodeId} not found or has no ${target}`);
  }
  return node;
};

const paintsOf = (node: BaseNode, target: PaintTarget): readonly Paint[] => {
  const paints: unknown = Reflect.get(node, target);
  if (!Array.isArray(paints)) {
    throw new Error(`${TOOL}: ${target} on ${node.id} is mixed or unreadable`);
  }
  return paints as readonly Paint[];
};

const solidPaintAt = (
  paints: readonly Paint[],
  target: PaintTarget,
  index: number,
  nodeId: string,
): SolidPaint => {
  const paint = paints[index];
  if (paint === undefined) throw new Error(`${TOOL}: no paint at ${target}[${index}] on ${nodeId}`);
  if (paint.type !== 'SOLID') {
    throw new Error(
      `${TOOL}: ${target}[${index}] is ${paint.type}; only SOLID paints bind a colour variable`,
    );
  }
  return paint;
};

export const createBindVariableToPaintHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, bindVariableToPaintParams, raw);
    const target = params.target ?? 'fills';
    const index = params.index ?? 0;
    const node = await requirePaintedNode(figmaCtx, params.nodeId, target);
    const variable = await findVariable(figmaCtx, TOOL, params.variableId);
    const paints = paintsOf(node, target);
    const solid = solidPaintAt(paints, target, index, node.id);
    const bound = figmaCtx.variables.setBoundVariableForPaint(solid, 'color', variable);
    await writePaints(
      node,
      target,
      paints.map((paint, at) => (at === index ? bound : paint)),
    );
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
