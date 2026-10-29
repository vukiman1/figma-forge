import { SET_COMPLEX_STROKE_TOOL_NAME, setComplexStrokeParams } from '@figma-forge/core';

import { batchTool, type BatchInverse, defineInverse } from '../inverse.js';
import { liveNode, nodeForOp } from '../live-node.js';
import { same } from '../snapshot/values.js';
import { restoreWidthProfile } from './width-profile.js';

interface ComplexStrokeState {
  readonly id: string;
  readonly complex: ComplexStrokeProperties;
  readonly widths: VariableWidthStrokeProperties;
}

const TOOL = batchTool(SET_COMPLEX_STROKE_TOOL_NAME);

const loadBrush = async (
  figmaCtx: typeof figma,
  id: string,
  complex: ComplexStrokeProperties,
): Promise<void> => {
  if (complex.type !== 'BRUSH') return;
  if (complex.brushName === 'CUSTOM') {
    throw new Error(
      `${TOOL}: node ${id} has a custom brush, which the plugin API cannot set back — ` +
        'run this outside the batch',
    );
  }
  await figmaCtx.loadBrushesAsync(complex.brushType);
};

const captureComplexStroke = async (
  figmaCtx: typeof figma,
  id: string,
): Promise<ComplexStrokeState> => {
  const node = await nodeForOp(figmaCtx, id, SET_COMPLEX_STROKE_TOOL_NAME);
  if (!('complexStrokeProperties' in node)) {
    throw new Error(`${TOOL}: node ${id} has no stroke to restyle`);
  }
  const complex = node.complexStrokeProperties;
  await loadBrush(figmaCtx, id, complex);
  return {
    id,
    complex,
    widths: node.variableWidthStrokeProperties ?? { widthProfile: 'UNIFORM' },
  };
};

const restoreComplexStroke = async (
  figmaCtx: typeof figma,
  { id, complex, widths }: ComplexStrokeState,
): Promise<undefined> => {
  const node = await liveNode(figmaCtx, id);
  if (node === null || !('complexStrokeProperties' in node)) return undefined;
  restoreWidthProfile(node, widths);
  if (!same(node.complexStrokeProperties, complex)) node.complexStrokeProperties = complex;
  return undefined;
};

export const setComplexStrokeInverse: BatchInverse = defineInverse(
  SET_COMPLEX_STROKE_TOOL_NAME,
  setComplexStrokeParams,
  {
    capture: async (figmaCtx, { nodeId }) => captureComplexStroke(figmaCtx, nodeId),
    undo: async (figmaCtx, state) => restoreComplexStroke(figmaCtx, state),
    touches: ({ id }) => [id],
  },
);
