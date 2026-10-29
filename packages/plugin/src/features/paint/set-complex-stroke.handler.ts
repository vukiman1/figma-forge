import {
  type MutateResult,
  SET_COMPLEX_STROKE_TOOL_NAME as TOOL,
  setComplexStrokeParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../runtime/sandbox-handler.js';
import { parseParams } from '../parse-params.js';
import { toFigmaComplexStroke, toFigmaVariableWidth } from './to-figma-complex-stroke.js';

type StrokedNode = BaseNode & ComplexStrokesMixin & MinimalStrokesMixin;

const COMPLEX_VECTOR = /complex vector/i;

const requireStrokedNode = async (figmaCtx: typeof figma, nodeId: string): Promise<StrokedNode> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node === null || !('complexStrokeProperties' in node)) {
    throw new Error(`${TOOL}: node ${nodeId} not found or has no stroke to restyle`);
  }
  if (!node.strokes.some(paint => paint.visible !== false)) {
    throw new Error(
      `${TOOL}: node ${nodeId} has no visible stroke for this to shape — give it one with ` +
        'set_strokes first',
    );
  }
  return node;
};

const applyWidths = (node: StrokedNode, widths: VariableWidthStrokeProperties): void => {
  try {
    node.variableWidthStrokeProperties = widths;
  } catch (error) {
    if (!COMPLEX_VECTOR.test(String(error))) throw error;
    throw new Error(
      `${TOOL}: node ${node.id} is a vector that branches, which cannot take a width profile ` +
        '(a brush or a dynamic stroke still can)',
      { cause: error },
    );
  }
};

export const createSetComplexStrokeHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, setComplexStrokeParams, raw);
    const { complexStrokeProperties, variableWidthStrokeProperties } = params;
    if (complexStrokeProperties === undefined && variableWidthStrokeProperties === undefined) {
      throw new TypeError(
        `${TOOL}: give complexStrokeProperties, variableWidthStrokeProperties or both`,
      );
    }
    const complex =
      complexStrokeProperties === undefined
        ? undefined
        : toFigmaComplexStroke(complexStrokeProperties, TOOL);
    const widths =
      variableWidthStrokeProperties === undefined
        ? undefined
        : toFigmaVariableWidth(variableWidthStrokeProperties, TOOL);
    const node = await requireStrokedNode(figmaCtx, params.nodeId);
    if (complex?.type === 'BRUSH') await figmaCtx.loadBrushesAsync(complex.brushType);
    if (widths !== undefined) applyWidths(node, widths);
    if (complex !== undefined) node.complexStrokeProperties = complex;
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
