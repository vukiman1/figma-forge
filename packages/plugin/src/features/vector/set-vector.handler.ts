import {
  SET_VECTOR_TOOL_NAME as TOOL,
  type MutateResult,
  setVectorParams,
} from '@figma-forge/core';

import type { SandboxToolHandler } from '../../dispatcher.js';
import { parseParams } from '../parse-params.js';
import { drawGeometry, toVectorGeometry } from './vector-geometry.js';

const requireVector = async (figmaCtx: typeof figma, nodeId: string): Promise<VectorNode> => {
  const node = await figmaCtx.getNodeByIdAsync(nodeId);
  if (node?.type === 'VECTOR') return node;
  throw new Error(
    `${TOOL}: node ${nodeId} is ${node === null ? 'not found' : `a ${node.type}`} — only a ` +
      'VECTOR can be redrawn (flatten_nodes turns a shape into one; a text path keeps its path)',
  );
};

const restoreLineEnds = (
  node: VectorNode,
  cap: VectorNode['strokeCap'],
  join: VectorNode['strokeJoin'],
): void => {
  if (typeof cap === 'string' && node.strokeCap !== cap) node.strokeCap = cap;
  if (typeof join === 'string' && node.strokeJoin !== join) node.strokeJoin = join;
};

export const createSetVectorHandler =
  (figmaCtx: typeof figma): SandboxToolHandler =>
  async raw => {
    const params = parseParams(TOOL, setVectorParams, raw);
    const geometry = await toVectorGeometry(figmaCtx, params, TOOL);
    const node = await requireVector(figmaCtx, params.nodeId);
    const { strokeCap, strokeJoin } = node;
    await drawGeometry(node, geometry);
    if (geometry.kind === 'paths') restoreLineEnds(node, strokeCap, strokeJoin);
    const result: MutateResult = { ok: true, nodeId: node.id };
    return result;
  };
